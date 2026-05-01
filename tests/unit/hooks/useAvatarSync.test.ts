import { renderHook, act } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { asEventId, asPairId, asUserId } from '@/shared/types/ids';
import { useAvatarSync } from '@/hooks/useAvatarSync';
import type { ExpressionPayload } from '@/domain/avatar/value-objects/expression.payload';

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

const zeroWeights = {
  happy: 0,
  sad: 0,
  angry: 0,
  relaxed: 0,
  surprised: 0,
  aa: 0,
  ih: 0,
  ou: 0,
  ee: 0,
  oh: 0,
};

function makeExpressionRaw(userId: string, overrides?: Partial<typeof zeroWeights>) {
  return { userId, weights: { ...zeroWeights, ...overrides }, lookAt: null, ts: 1000 };
}

describe('useAvatarSync', () => {
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

  it('subscribes to the expression channel', () => {
    renderHook(() => useAvatarSync(eventId, pairId));

    expect(mocks.channelFactoryMock.get).toHaveBeenCalledWith('event:evt-1:expression:pair-1');
    expect(mocks.subscribe).toHaveBeenCalled();
  });

  it('returns empty expressions initially', () => {
    const { result } = renderHook(() => useAvatarSync(eventId, pairId));
    expect(result.current.expressions).toEqual({});
  });

  it('stores expression keyed by userId when broadcast arrives', () => {
    const { result } = renderHook(() => useAvatarSync(eventId, pairId));

    act(() => {
      mocks.handlerCapture.current!({ payload: makeExpressionRaw('user-a', { happy: 0.8 }) });
    });

    expect(result.current.expressions['user-a']).toBeDefined();
    expect(result.current.expressions['user-a']!.weights.happy).toBe(0.8);
  });

  it('merges expressions from multiple users without overwriting others', () => {
    const { result } = renderHook(() => useAvatarSync(eventId, pairId));

    act(() => {
      mocks.handlerCapture.current!({ payload: makeExpressionRaw('user-a') });
    });
    act(() => {
      mocks.handlerCapture.current!({ payload: makeExpressionRaw('user-b', { sad: 0.5 }) });
    });

    expect(result.current.expressions['user-a']).toBeDefined();
    expect(result.current.expressions['user-b']).toBeDefined();
    expect(result.current.expressions['user-b']!.weights.sad).toBe(0.5);
  });

  it('ignores broadcast with invalid payload', () => {
    const { result } = renderHook(() => useAvatarSync(eventId, pairId));

    act(() => {
      mocks.handlerCapture.current!({ payload: { userId: 'user-a', weights: 'bad' } });
    });

    expect(result.current.expressions).toEqual({});
  });

  it('calls channelFactory.remove() on unmount to unsubscribe the channel', () => {
    const { unmount } = renderHook(() => useAvatarSync(eventId, pairId));
    unmount();
    expect(mocks.remove).toHaveBeenCalledWith('event:evt-1:expression:pair-1');
  });

  it('calls channelFactory.remove() for old channel when eventId changes', () => {
    const eventId2 = asEventId('evt-2');
    const { rerender } = renderHook(({ id }) => useAvatarSync(id, pairId), {
      initialProps: { id: eventId },
    });
    rerender({ id: eventId2 });
    expect(mocks.remove).toHaveBeenCalledWith('event:evt-1:expression:pair-1');
  });

  it('emit() calls channel.send() with the expression payload', () => {
    const { result } = renderHook(() => useAvatarSync(eventId, pairId));
    const payload: ExpressionPayload = {
      userId: asUserId('user-a'),
      weights: { ...zeroWeights, happy: 0.9 },
      lookAt: { x: 0.1, y: -0.1 },
      ts: 2000,
    };

    act(() => {
      result.current.emit(payload);
    });

    expect(mocks.send).toHaveBeenCalledWith({
      type: 'broadcast',
      event: 'expression',
      payload,
    });
  });
});
