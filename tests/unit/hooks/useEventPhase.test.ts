import { renderHook, act } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { asEventId } from '@/shared/types/ids';
import { useEventPhase } from '@/hooks/useEventPhase';

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

describe('useEventPhase', () => {
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

  it('subscribes to the eventState channel with presence option', () => {
    renderHook(() => useEventPhase(eventId));

    expect(mocks.channelFactoryMock.get).toHaveBeenCalledWith('event:evt-1:state', {
      presence: true,
    });
    expect(mocks.subscribe).toHaveBeenCalled();
  });

  it('returns null phase and zero round initially', () => {
    const { result } = renderHook(() => useEventPhase(eventId));

    expect(result.current.phase).toBeNull();
    expect(result.current.round).toBe(0);
    expect(result.current.startedAt).toBeNull();
  });

  it('updates state when a valid broadcast arrives', () => {
    const { result } = renderHook(() => useEventPhase(eventId));

    act(() => {
      mocks.handlerCapture.current!({
        payload: { phase: 'voting', round: 2, startedAt: '2026-04-25T12:00:00.000Z' },
      });
    });

    expect(result.current.phase).toBe('voting');
    expect(result.current.round).toBe(2);
    expect(result.current.startedAt).toBe('2026-04-25T12:00:00.000Z');
  });

  it('ignores broadcast with invalid payload', () => {
    const { result } = renderHook(() => useEventPhase(eventId));

    act(() => {
      mocks.handlerCapture.current!({ payload: { notAPhase: true } });
    });

    expect(result.current.phase).toBeNull();
  });

  it('calls channelFactory.remove() on unmount to release the refcount', () => {
    const { unmount } = renderHook(() => useEventPhase(eventId));
    unmount();
    expect(mocks.remove).toHaveBeenCalledWith('event:evt-1:state');
  });

  it('calls channelFactory.remove() for old channel when eventId changes', () => {
    const eventId2 = asEventId('evt-2');
    const { rerender } = renderHook(({ id }) => useEventPhase(id), {
      initialProps: { id: eventId },
    });
    rerender({ id: eventId2 });
    expect(mocks.remove).toHaveBeenCalledWith('event:evt-1:state');
  });
});
