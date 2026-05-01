import { describe, it, expect, vi, beforeEach } from 'vitest';

const mockRemoveChannel = vi.fn().mockResolvedValue(undefined);
const mockChannel = vi.fn();

vi.mock('@/infrastructure/supabase/client-browser', () => ({
  createSupabaseBrowserClient: () => ({
    channel: mockChannel,
    removeChannel: mockRemoveChannel,
  }),
}));

describe('SupabaseChannelFactory', () => {
  beforeEach(() => {
    vi.resetModules();
    mockChannel.mockReset();
    mockRemoveChannel.mockReset().mockResolvedValue(undefined);
  });

  async function importFactory() {
    const mod = await import('@/infrastructure/realtime/supabase-channel.factory');
    return mod.channelFactory;
  }

  it('returns the same channel instance for the same name', async () => {
    const fakeChannel = { subscribe: vi.fn() };
    mockChannel.mockReturnValue(fakeChannel);

    const factory = await importFactory();
    const ch1 = factory.get('event:id:state');
    const ch2 = factory.get('event:id:state');

    expect(ch1).toBe(ch2);
    expect(mockChannel).toHaveBeenCalledTimes(1);
  });

  it('creates separate channel instances for different names', async () => {
    const fakeA = { name: 'A' };
    const fakeB = { name: 'B' };
    mockChannel.mockReturnValueOnce(fakeA).mockReturnValueOnce(fakeB);

    const factory = await importFactory();
    const a = factory.get('event:id:stamp');
    const b = factory.get('event:id:state');

    expect(a).not.toBe(b);
    expect(mockChannel).toHaveBeenCalledTimes(2);
  });

  it('passes presence config when presence option is true', async () => {
    mockChannel.mockReturnValue({});
    const factory = await importFactory();

    factory.get('event:id:state', { presence: true });

    expect(mockChannel).toHaveBeenCalledWith('event:id:state', {
      config: { presence: { key: 'event:id:state' } },
    });
  });

  it('does not pass presence config when presence option is false', async () => {
    mockChannel.mockReturnValue({});
    const factory = await importFactory();

    factory.get('event:id:stamp');

    expect(mockChannel).toHaveBeenCalledWith('event:id:stamp');
  });

  it('has() returns false for unknown channels', async () => {
    const factory = await importFactory();
    expect(factory.has('event:id:unknown')).toBe(false);
  });

  it('has() returns true after get()', async () => {
    mockChannel.mockReturnValue({});
    const factory = await importFactory();

    factory.get('event:id:stamp2');
    expect(factory.has('event:id:stamp2')).toBe(true);
  });

  it('remove() calls removeChannel and clears the cache when refcount drops to 0', async () => {
    const fakeChannel = { id: 'ch' };
    mockChannel.mockReturnValue(fakeChannel);

    const factory = await importFactory();
    factory.get('event:id:stamp3');
    await factory.remove('event:id:stamp3');

    expect(mockRemoveChannel).toHaveBeenCalledWith(fakeChannel);
    expect(factory.has('event:id:stamp3')).toBe(false);
  });

  it('remove() is a no-op for unknown channels', async () => {
    const factory = await importFactory();
    await expect(factory.remove('nonexistent')).resolves.toBeUndefined();
    expect(mockRemoveChannel).not.toHaveBeenCalled();
  });

  it('removeAll() removes all cached channels regardless of refcount', async () => {
    mockChannel.mockReturnValue({});
    const factory = await importFactory();

    factory.get('ch-a');
    factory.get('ch-a');
    factory.get('ch-b');
    await factory.removeAll();

    expect(factory.has('ch-a')).toBe(false);
    expect(factory.has('ch-b')).toBe(false);
    expect(mockRemoveChannel).toHaveBeenCalledTimes(2);
    expect(factory.refCount('ch-a')).toBe(0);
  });

  describe('refcount semantics', () => {
    it('increments refcount on each get() call for the same name', async () => {
      mockChannel.mockReturnValue({});
      const factory = await importFactory();

      factory.get('ch:shared');
      factory.get('ch:shared');
      factory.get('ch:shared');

      expect(factory.refCount('ch:shared')).toBe(3);
      expect(mockChannel).toHaveBeenCalledTimes(1);
    });

    it('keeps the channel alive while refcount > 0', async () => {
      const fakeChannel = { id: 'ch' };
      mockChannel.mockReturnValue(fakeChannel);
      const factory = await importFactory();

      factory.get('ch:shared');
      factory.get('ch:shared');
      await factory.remove('ch:shared');

      expect(mockRemoveChannel).not.toHaveBeenCalled();
      expect(factory.has('ch:shared')).toBe(true);
      expect(factory.refCount('ch:shared')).toBe(1);
    });

    it('removes the channel only when refcount drops to 0', async () => {
      const fakeChannel = { id: 'ch' };
      mockChannel.mockReturnValue(fakeChannel);
      const factory = await importFactory();

      factory.get('ch:shared');
      factory.get('ch:shared');
      await factory.remove('ch:shared');
      await factory.remove('ch:shared');

      expect(mockRemoveChannel).toHaveBeenCalledTimes(1);
      expect(mockRemoveChannel).toHaveBeenCalledWith(fakeChannel);
      expect(factory.has('ch:shared')).toBe(false);
      expect(factory.refCount('ch:shared')).toBe(0);
    });

    it('does not over-decrement when remove() is called more than get()', async () => {
      const fakeChannel = { id: 'ch' };
      mockChannel.mockReturnValue(fakeChannel);
      const factory = await importFactory();

      factory.get('ch:once');
      await factory.remove('ch:once');
      await factory.remove('ch:once'); // extra remove

      expect(mockRemoveChannel).toHaveBeenCalledTimes(1);
      expect(factory.refCount('ch:once')).toBe(0);
    });

    it('returns the same channel instance after re-get following partial release', async () => {
      const fakeChannel = { id: 'ch' };
      mockChannel.mockReturnValue(fakeChannel);
      const factory = await importFactory();

      const a = factory.get('ch:shared');
      factory.get('ch:shared');
      await factory.remove('ch:shared');
      const c = factory.get('ch:shared');

      expect(c).toBe(a);
      expect(factory.refCount('ch:shared')).toBe(2);
      expect(mockChannel).toHaveBeenCalledTimes(1);
    });

    it('refCount() returns 0 for unknown channel names', async () => {
      const factory = await importFactory();
      expect(factory.refCount('nope')).toBe(0);
    });
  });

  describe('removeChannel rejection handling', () => {
    it('keeps the channel in the cache when removeChannel() rejects', async () => {
      const fakeChannel = { id: 'ch' };
      mockChannel.mockReturnValue(fakeChannel);
      mockRemoveChannel.mockRejectedValueOnce(new Error('network'));

      const factory = await importFactory();
      factory.get('ch:flaky');

      await expect(factory.remove('ch:flaky')).rejects.toThrow('network');

      // 失敗時も Map に残っているので再試行可能
      expect(factory.has('ch:flaky')).toBe(true);
      expect(factory.refCount('ch:flaky')).toBe(1);

      // 復旧: 再度 remove() で成功させる
      mockRemoveChannel.mockResolvedValueOnce(undefined);
      await factory.remove('ch:flaky');
      expect(factory.has('ch:flaky')).toBe(false);
      expect(factory.refCount('ch:flaky')).toBe(0);
    });

    it('removeAll() leaves the cache populated when removeChannel() rejects', async () => {
      const fakeChannel = { id: 'ch' };
      mockChannel.mockReturnValue(fakeChannel);
      mockRemoveChannel.mockRejectedValueOnce(new Error('network'));

      const factory = await importFactory();
      factory.get('ch:a');

      await expect(factory.removeAll()).rejects.toThrow('network');

      expect(factory.has('ch:a')).toBe(true);
      expect(factory.refCount('ch:a')).toBe(1);
    });
  });
});
