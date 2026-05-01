import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { EventId, PairId } from '@/shared/types/ids';

const mockRemoveChannel = vi.fn().mockResolvedValue(undefined);
const mockChannel = vi.fn();

vi.mock('@/infrastructure/supabase/client-browser', () => ({
  createSupabaseBrowserClient: () => ({
    channel: mockChannel,
    removeChannel: mockRemoveChannel,
  }),
}));

type SubscribeStatus = 'SUBSCRIBED' | 'CHANNEL_ERROR' | 'TIMED_OUT' | 'CLOSED';

function makeFakeChannel() {
  let subscribeCb: ((status: SubscribeStatus) => void) | null = null;
  return {
    on: vi.fn().mockReturnThis(),
    subscribe: vi.fn((cb: (status: SubscribeStatus) => void) => {
      subscribeCb = cb;
      // 即時 SUBSCRIBED にする (テスト用)
      queueMicrotask(() => subscribeCb?.('SUBSCRIBED'));
      return { unsubscribe: vi.fn() };
    }),
    track: vi.fn().mockResolvedValue(undefined),
    send: vi.fn().mockResolvedValue(undefined),
    presenceState: vi.fn().mockReturnValue({}),
  };
}

describe('SignalingChannel — channelFactory acquire/release を 1:1 に正規化', () => {
  beforeEach(() => {
    vi.resetModules();
    mockChannel.mockReset();
    mockRemoveChannel.mockReset().mockResolvedValue(undefined);
  });

  async function importModules() {
    const channelMod = await import('@/infrastructure/realtime/supabase-channel.factory');
    const sigMod = await import('@/infrastructure/webrtc/signaling.channel');
    return { channelFactory: channelMod.channelFactory, SignalingChannel: sigMod.SignalingChannel };
  }

  const eventId = 'evt' as EventId;
  const pairId = 'pair' as PairId;

  it('subscribe → send×N → unsubscribe で refCount が 0 に戻りチャンネルが解放される', async () => {
    const fake = makeFakeChannel();
    mockChannel.mockReturnValue(fake);

    const { channelFactory, SignalingChannel } = await importModules();
    const sig = new SignalingChannel(eventId, pairId, 'user-self');

    await sig.subscribe(() => {});
    expect(channelFactory.refCount('presenter:evt:pair:signal')).toBe(1);

    // send を複数回呼んでも refCount は増えない (factory.get() を呼ばない)
    await sig.send({ type: 'offer', to: 'peer-1', sdp: { type: 'offer', sdp: 'v=0' } });
    await sig.send({ type: 'answer', to: 'peer-1', sdp: { type: 'answer', sdp: 'v=0' } });
    await sig.send({
      type: 'candidate',
      to: 'peer-1',
      candidate: { candidate: 'a=ice', sdpMid: '0' },
    });

    expect(channelFactory.refCount('presenter:evt:pair:signal')).toBe(1);

    // getPeers も refCount を増やさない
    sig.getPeers();
    sig.getPeers();
    expect(channelFactory.refCount('presenter:evt:pair:signal')).toBe(1);

    await sig.unsubscribe();
    expect(channelFactory.has('presenter:evt:pair:signal')).toBe(false);
    expect(channelFactory.refCount('presenter:evt:pair:signal')).toBe(0);
    expect(mockRemoveChannel).toHaveBeenCalledTimes(1);
  });

  it('subscribe を二重に呼んでも refCount は 1 のまま', async () => {
    const fake = makeFakeChannel();
    mockChannel.mockReturnValue(fake);

    const { channelFactory, SignalingChannel } = await importModules();
    const sig = new SignalingChannel(eventId, pairId, 'user-self');

    await sig.subscribe(() => {});
    await sig.subscribe(() => {});

    expect(channelFactory.refCount('presenter:evt:pair:signal')).toBe(1);

    await sig.unsubscribe();
    expect(channelFactory.has('presenter:evt:pair:signal')).toBe(false);
  });

  it('subscribe 前の send() は明示的にエラーを投げる', async () => {
    const { SignalingChannel } = await importModules();
    const sig = new SignalingChannel(eventId, pairId, 'user-self');

    await expect(
      sig.send({ type: 'offer', to: 'peer-1', sdp: { type: 'offer', sdp: 'v=0' } }),
    ).rejects.toThrow(/before subscribe/);
  });

  it('subscribe 前の getPeers() は空配列を返す', async () => {
    const { SignalingChannel } = await importModules();
    const sig = new SignalingChannel(eventId, pairId, 'user-self');

    expect(sig.getPeers()).toEqual([]);
  });

  it('unsubscribe を二重に呼んでも removeChannel は 1 回だけ呼ばれる', async () => {
    const fake = makeFakeChannel();
    mockChannel.mockReturnValue(fake);

    const { SignalingChannel } = await importModules();
    const sig = new SignalingChannel(eventId, pairId, 'user-self');

    await sig.subscribe(() => {});
    await sig.unsubscribe();
    await sig.unsubscribe();

    expect(mockRemoveChannel).toHaveBeenCalledTimes(1);
  });
});
