import { renderHook, act } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { asEventId, asPairId } from '@/shared/types/ids';
import { useStampBroadcast } from '@/hooks/useStampBroadcast';

const mocks = vi.hoisted(() => {
  const subscribe = vi.fn();
  const send = vi.fn();
  const handlerCapture = {
    current: null as ((msg: { payload: unknown }) => void) | null,
  };
  const channel = {
    on: vi
      .fn()
      .mockImplementation(
        (_type: string, _filter: unknown, handler: (msg: { payload: unknown }) => void) => {
          handlerCapture.current = handler;
        },
      ),
    subscribe,
    send,
  };
  const remove = vi.fn().mockResolvedValue(undefined);
  const channelFactoryMock = { get: vi.fn().mockReturnValue(channel), remove };
  return { subscribe, send, remove, channel, channelFactoryMock, handlerCapture };
});

vi.mock('@/infrastructure/realtime/supabase-channel.factory', () => ({
  channelFactory: mocks.channelFactoryMock,
}));

const eventId = asEventId('evt-1');
const pairId = asPairId('pair-1');

describe('useStampBroadcast', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.handlerCapture.current = null;
    mocks.channel.on.mockImplementation(
      (_type: string, _filter: unknown, handler: (msg: { payload: unknown }) => void) => {
        mocks.handlerCapture.current = handler;
      },
    );
    mocks.channelFactoryMock.get.mockReturnValue(mocks.channel);
  });

  it('subscribes to the stamp channel', () => {
    renderHook(() => useStampBroadcast(eventId));

    expect(mocks.channelFactoryMock.get).toHaveBeenCalledWith('event:evt-1:stamp');
    expect(mocks.subscribe).toHaveBeenCalled();
  });

  it('returns null lastStamp initially', () => {
    const { result } = renderHook(() => useStampBroadcast(eventId));
    expect(result.current.lastStamp).toBeNull();
  });

  it('updates lastStamp when a valid broadcast arrives', () => {
    const { result } = renderHook(() => useStampBroadcast(eventId));

    act(() => {
      mocks.handlerCapture.current!({
        payload: { pairId: 'pair-1', kind: 'clap', clientNonce: 'nonce-1' },
      });
    });

    expect(result.current.lastStamp).not.toBeNull();
    expect(result.current.lastStamp?.kind).toBe('clap');
  });

  it('ignores broadcast with invalid stamp kind', () => {
    const { result } = renderHook(() => useStampBroadcast(eventId));

    act(() => {
      mocks.handlerCapture.current!({
        payload: { pairId: 'pair-1', kind: 'invalid-kind', clientNonce: 'nonce-1' },
      });
    });

    expect(result.current.lastStamp).toBeNull();
  });

  it('sendStamp() does not include sender userId in the payload', () => {
    const { result } = renderHook(() => useStampBroadcast(eventId));

    act(() => {
      result.current.sendStamp('handshake', pairId);
    });

    expect(mocks.send).toHaveBeenCalledOnce();
    const sentPayload = mocks.send.mock.calls[0]![0].payload;
    expect(sentPayload).not.toHaveProperty('userId');
    expect(sentPayload.kind).toBe('handshake');
    expect(sentPayload.pairId).toBe(pairId);
    expect(sentPayload.clientNonce).toBeTypeOf('string');
  });

  it('sendStamp() calls channel.send() on the stamp channel', () => {
    const { result } = renderHook(() => useStampBroadcast(eventId));

    act(() => {
      result.current.sendStamp('sparkle', pairId);
    });

    expect(mocks.send).toHaveBeenCalledWith(
      expect.objectContaining({ type: 'broadcast', event: 'stamp' }),
    );
  });

  it('calls channelFactory.remove() on unmount to release the refcount', () => {
    const { unmount } = renderHook(() => useStampBroadcast(eventId));
    unmount();
    expect(mocks.remove).toHaveBeenCalledWith('event:evt-1:stamp');
  });

  it('calls channelFactory.remove() for old channel when eventId changes', () => {
    const eventId2 = asEventId('evt-2');
    const { rerender } = renderHook(({ id }) => useStampBroadcast(id), {
      initialProps: { id: eventId },
    });
    rerender({ id: eventId2 });
    expect(mocks.remove).toHaveBeenCalledWith('event:evt-1:stamp');
  });
});
