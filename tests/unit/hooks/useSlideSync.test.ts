import { renderHook, act } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { asEventId, asPairId, asDeckId } from '@/shared/types/ids';
import { useSlideSync } from '@/hooks/useSlideSync';

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
  const channelFactoryMock = { get: vi.fn().mockReturnValue(channel) };
  return { subscribe, send, channel, channelFactoryMock, handlerCapture };
});

vi.mock('@/infrastructure/realtime/supabase-channel.factory', () => ({
  channelFactory: mocks.channelFactoryMock,
}));

const eventId = asEventId('evt-1');
const pairId = asPairId('pair-1');

const validPayload = {
  deckId: 'deck-1',
  pairId: 'pair-1',
  slideIndex: 2,
  updatedAt: '2026-04-25T12:00:00.000Z',
};

describe('useSlideSync', () => {
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

  it('subscribes to the slideSync channel', () => {
    renderHook(() => useSlideSync(eventId, pairId));

    expect(mocks.channelFactoryMock.get).toHaveBeenCalledWith('event:evt-1:slide-sync:pair-1');
    expect(mocks.subscribe).toHaveBeenCalled();
  });

  it('returns null current initially', () => {
    const { result } = renderHook(() => useSlideSync(eventId, pairId));
    expect(result.current.current).toBeNull();
  });

  it('updates current when a valid broadcast arrives', () => {
    const { result } = renderHook(() => useSlideSync(eventId, pairId));

    act(() => {
      mocks.handlerCapture.current!({ payload: validPayload });
    });

    expect(result.current.current).not.toBeNull();
    expect(result.current.current?.slideIndex).toBe(2);
    expect(result.current.current?.deckId).toBe(asDeckId('deck-1'));
  });

  it('ignores broadcast with invalid payload', () => {
    const { result } = renderHook(() => useSlideSync(eventId, pairId));

    act(() => {
      mocks.handlerCapture.current!({ payload: { slideIndex: 'not-a-number' } });
    });

    expect(result.current.current).toBeNull();
  });

  it('broadcast() calls channel.send() with the correct payload', () => {
    const { result } = renderHook(() => useSlideSync(eventId, pairId));
    const payload = {
      deckId: asDeckId('deck-1'),
      pairId: asPairId('pair-1'),
      slideIndex: 3,
      updatedAt: '2026-04-25T13:00:00.000Z',
    };

    act(() => {
      result.current.broadcast(payload);
    });

    expect(mocks.send).toHaveBeenCalledWith({
      type: 'broadcast',
      event: 'slide-sync',
      payload,
    });
  });
});
