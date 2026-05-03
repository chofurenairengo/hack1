import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';

// Capture useFrame callback so tests can drive the animation loop manually
let capturedFrameCallback: ((state: unknown, delta: number) => void) | null = null;

vi.mock('@react-three/fiber', () => ({
  useFrame: vi.fn((cb: (state: unknown, delta: number) => void) => {
    capturedFrameCallback = cb;
  }),
}));

const mockStopAllAction = vi.hoisted(() => vi.fn());
const mockUncacheRoot = vi.hoisted(() => vi.fn());
const mockClipAction = vi.hoisted(() => vi.fn());
const mockAddEventListener = vi.hoisted(() => vi.fn());
const mockMixerUpdate = vi.hoisted(() => vi.fn());

vi.mock('three', () => ({
  AnimationMixer: vi.fn().mockImplementation(function () {
    return {
      update: mockMixerUpdate,
      clipAction: mockClipAction,
      stopAllAction: mockStopAllAction,
      uncacheRoot: mockUncacheRoot,
      addEventListener: mockAddEventListener,
    };
  }),
  LoopRepeat: 2200,
  LoopOnce: 2201,
}));

vi.mock('@pixiv/three-vrm-animation', () => ({
  createVRMAnimationClip: vi.fn().mockReturnValue({ name: 'mock-clip', duration: 1 }),
}));

const mockVrmaLoad = vi.hoisted(() => vi.fn());
vi.mock('@/infrastructure/vrm/vrma-loader', () => ({
  vrmaLoader: { load: mockVrmaLoad },
}));

import { useVRMAnimationPlayer } from '../useVRMAnimationPlayer';

const fakeScene = { isObject3D: true };
const fakeVrm = { scene: fakeScene } as unknown as import('@pixiv/three-vrm').VRM;

function makeOkResult(value: unknown) {
  return { ok: true as const, value };
}

function makeErrResult(error: unknown) {
  return { ok: false as const, error };
}

const mockIdleAction = {
  setLoop: vi.fn(),
  play: vi.fn(),
  crossFadeTo: vi.fn(),
};

const makeTalkAction = () => ({
  setLoop: vi.fn(),
  play: vi.fn(),
  reset: vi.fn().mockReturnThis(),
  crossFadeTo: vi.fn(),
  clampWhenFinished: false,
  weight: 0,
});

beforeEach(() => {
  vi.clearAllMocks();
  capturedFrameCallback = null;

  const talkActions = [makeTalkAction(), makeTalkAction(), makeTalkAction()];
  let clipCallCount = 0;
  mockClipAction.mockImplementation(() => {
    if (clipCallCount === 0) {
      clipCallCount++;
      return mockIdleAction;
    }
    const idx = clipCallCount - 1;
    clipCallCount++;
    return talkActions[idx % talkActions.length];
  });

  const fakeAnim = { name: 'anim' };
  mockVrmaLoad.mockResolvedValue(makeOkResult(fakeAnim));
});

afterEach(() => {
  vi.clearAllMocks();
});

function tickFrame(delta: number) {
  act(() => {
    capturedFrameCallback?.(null, delta);
  });
}

describe('useVRMAnimationPlayer', () => {
  it('creates AnimationMixer when vrm is provided', async () => {
    const { AnimationMixer } = await import('three');
    renderHook(() =>
      useVRMAnimationPlayer({ vrm: fakeVrm, talkingWeight: 0, reducedMotion: false }),
    );
    expect(AnimationMixer).toHaveBeenCalledWith(fakeScene);
  });

  it('does not create AnimationMixer when vrm is null', async () => {
    const { AnimationMixer } = await import('three');
    renderHook(() => useVRMAnimationPlayer({ vrm: null, talkingWeight: 0, reducedMotion: false }));
    expect(AnimationMixer).not.toHaveBeenCalled();
  });

  it('loads all 4 VRMA files on mount', async () => {
    const { renderHook: rh } = await import('@testing-library/react');
    rh(() => useVRMAnimationPlayer({ vrm: fakeVrm, talkingWeight: 0, reducedMotion: false }));
    // flush promises
    await act(async () => {});
    expect(mockVrmaLoad).toHaveBeenCalledTimes(4);
    expect(mockVrmaLoad).toHaveBeenCalledWith('/vrma/idle.vrma');
    expect(mockVrmaLoad).toHaveBeenCalledWith('/vrma/talking01.vrma');
    expect(mockVrmaLoad).toHaveBeenCalledWith('/vrma/talking02.vrma');
    expect(mockVrmaLoad).toHaveBeenCalledWith('/vrma/talking03.vrma');
  });

  it('stays idle when aa weight stays below threshold', async () => {
    const { result } = renderHook(() =>
      useVRMAnimationPlayer({ vrm: fakeVrm, talkingWeight: 0.01, reducedMotion: false }),
    );
    await act(async () => {});
    // tick with sub-threshold weight for well beyond 100ms
    for (let i = 0; i < 20; i++) tickFrame(0.016);
    // idle action should not have crossFadeTo called (no talking transition)
    expect(mockIdleAction.crossFadeTo).not.toHaveBeenCalled();
    void result;
  });

  it('transitions to talking when aa >= threshold for >= 100ms', async () => {
    renderHook(() =>
      useVRMAnimationPlayer({ vrm: fakeVrm, talkingWeight: 0.1, reducedMotion: false }),
    );
    await act(async () => {});
    // 7 ticks × 16ms = 112ms > 100ms onset
    for (let i = 0; i < 7; i++) tickFrame(0.016);
    expect(mockIdleAction.crossFadeTo).toHaveBeenCalled();
  });

  it('resets accumulator when weight drops below threshold mid-onset', async () => {
    const weight = 0.1;
    const { rerender } = renderHook(
      (props) =>
        useVRMAnimationPlayer({ vrm: fakeVrm, talkingWeight: props.w, reducedMotion: false }),
      { initialProps: { w: 0.1 } },
    );
    await act(async () => {});
    // accumulate for 3 ticks (48ms — not yet 100ms)
    for (let i = 0; i < 3; i++) tickFrame(0.016);
    // drop below threshold
    rerender({ w: 0.01 });
    await act(async () => {});
    tickFrame(0.016);
    // now accumulate again — 4 more ticks = 64ms, still < 100ms from reset
    rerender({ w: 0.1 });
    for (let i = 0; i < 4; i++) tickFrame(0.016);
    // crossFadeTo should NOT have been called (accumulated less than 100ms since reset)
    expect(mockIdleAction.crossFadeTo).not.toHaveBeenCalled();
    void weight;
  });

  it('calls stopAllAction and uncacheRoot on unmount', async () => {
    const { unmount } = renderHook(() =>
      useVRMAnimationPlayer({ vrm: fakeVrm, talkingWeight: 0, reducedMotion: false }),
    );
    await act(async () => {});
    unmount();
    expect(mockStopAllAction).toHaveBeenCalled();
    expect(mockUncacheRoot).toHaveBeenCalledWith(fakeScene);
  });

  it('does not transition to talking when reducedMotion=true', async () => {
    renderHook(() =>
      useVRMAnimationPlayer({ vrm: fakeVrm, talkingWeight: 1.0, reducedMotion: true }),
    );
    await act(async () => {});
    for (let i = 0; i < 20; i++) tickFrame(0.016);
    expect(mockIdleAction.crossFadeTo).not.toHaveBeenCalled();
  });

  it('calls mixer.update with delta on each frame', async () => {
    renderHook(() =>
      useVRMAnimationPlayer({ vrm: fakeVrm, talkingWeight: 0, reducedMotion: false }),
    );
    await act(async () => {});
    tickFrame(0.016);
    expect(mockMixerUpdate).toHaveBeenCalledWith(0.016);
  });

  it('does nothing in useFrame when vrm is null', () => {
    renderHook(() => useVRMAnimationPlayer({ vrm: null, talkingWeight: 0, reducedMotion: false }));
    tickFrame(0.016);
    expect(mockMixerUpdate).not.toHaveBeenCalled();
  });

  it('returns err gracefully when a VRMA file fails to load', async () => {
    mockVrmaLoad.mockImplementation((url: string) => {
      if (url === '/vrma/idle.vrma')
        return Promise.resolve(makeErrResult({ code: 'load_failed', message: 'not found', url }));
      return Promise.resolve(makeOkResult({ name: 'anim' }));
    });
    expect(() =>
      renderHook(() =>
        useVRMAnimationPlayer({ vrm: fakeVrm, talkingWeight: 0, reducedMotion: false }),
      ),
    ).not.toThrow();
    await act(async () => {});
    // idle action not set — no play called
    expect(mockIdleAction.play).not.toHaveBeenCalled();
  });
});
