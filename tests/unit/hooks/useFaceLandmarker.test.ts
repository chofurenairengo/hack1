import { renderHook, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { createRef } from 'react';

const { mockDetect, mockClose, mockCreateFaceLandmarker, mockMapBlendShapes } = vi.hoisted(() => ({
  mockDetect: vi.fn(),
  mockClose: vi.fn(),
  mockCreateFaceLandmarker: vi.fn(),
  mockMapBlendShapes: vi.fn(),
}));

vi.mock('@/infrastructure/mediapipe/face-landmarker', () => ({
  createFaceLandmarker: mockCreateFaceLandmarker,
}));

vi.mock('@/infrastructure/avatar/retarget', () => ({
  BlendShapeMapper: vi.fn(function () {
    return { mapBlendShapes: mockMapBlendShapes, reset: vi.fn() };
  }),
}));

const mockRafId = 42;
const mockRaf = vi.fn();
const mockCancelRaf = vi.fn();
vi.stubGlobal('requestAnimationFrame', mockRaf);
vi.stubGlobal('cancelAnimationFrame', mockCancelRaf);

import { useFaceLandmarker } from '@/hooks/useFaceLandmarker';

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

function makeHandle() {
  return { detect: mockDetect, close: mockClose };
}

function makeVideoRef(readyState = 4) {
  const ref = createRef<HTMLVideoElement>();
  Object.defineProperty(ref, 'current', {
    value: { readyState } as HTMLVideoElement,
    writable: true,
  });
  return ref;
}

describe('useFaceLandmarker', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockMapBlendShapes.mockReturnValue({ ...zeroWeights });
    // Default: rAF runs the callback once per scheduling round and returns a stable ID.
    // The re-entrancy guard prevents infinite recursion when tick() calls rAF again.
    let rafBusy = false;
    mockRaf.mockImplementation((cb: FrameRequestCallback) => {
      if (!rafBusy) {
        rafBusy = true;
        cb(performance.now());
        rafBusy = false;
      }
      return mockRafId;
    });
    mockCreateFaceLandmarker.mockResolvedValue(makeHandle());
    mockDetect.mockReturnValue(null);
  });

  it('マウント直後は isReady=false, blendShapes=null', () => {
    mockCreateFaceLandmarker.mockReturnValue(new Promise(() => {})); // never resolves
    const videoRef = makeVideoRef();
    const { result } = renderHook(() => useFaceLandmarker(videoRef));
    expect(result.current.isReady).toBe(false);
    expect(result.current.blendShapes).toBeNull();
    expect(result.current.error).toBeNull();
  });

  it('初期化完了後に isReady=true になる', async () => {
    const videoRef = makeVideoRef();
    const { result } = renderHook(() => useFaceLandmarker(videoRef));
    await waitFor(() => expect(result.current.isReady).toBe(true));
  });

  it('detect が arkit52 を返すと BlendShapeMapper 経由で blendShapes が更新される', async () => {
    const fakeArkit52 = { mouthSmileLeft: 0.8, mouthSmileRight: 0.8 };
    const mapped = { ...zeroWeights, happy: 0.8 };
    mockDetect.mockReturnValue({ arkit52: fakeArkit52, lookAt: null });
    mockMapBlendShapes.mockReturnValue(mapped);
    const videoRef = makeVideoRef();
    const { result } = renderHook(() => useFaceLandmarker(videoRef));
    await waitFor(() => expect(result.current.blendShapes?.happy).toBeCloseTo(0.8));
  });

  it('detect が null を返しても blendShapes は以前の値を維持する', async () => {
    const fakeArkit52 = { mouthSmileLeft: 0.5, mouthSmileRight: 0.5 };
    const mapped = { ...zeroWeights, happy: 0.5 };
    mockDetect.mockReturnValueOnce({ arkit52: fakeArkit52, lookAt: null }).mockReturnValue(null);
    mockMapBlendShapes.mockReturnValue(mapped);
    const videoRef = makeVideoRef();
    const { result } = renderHook(() => useFaceLandmarker(videoRef));
    await waitFor(() => expect(result.current.blendShapes?.happy).toBeCloseTo(0.5));
  });

  it('アンマウント時に close() が呼ばれる', async () => {
    const videoRef = makeVideoRef();
    const { unmount } = renderHook(() => useFaceLandmarker(videoRef));
    await waitFor(() => expect(mockCreateFaceLandmarker).toHaveBeenCalledOnce());
    unmount();
    expect(mockClose).toHaveBeenCalledOnce();
  });

  it('アンマウント時に rAF がキャンセルされる', async () => {
    const videoRef = makeVideoRef();
    const { unmount } = renderHook(() => useFaceLandmarker(videoRef));
    await waitFor(() => expect(mockCreateFaceLandmarker).toHaveBeenCalledOnce());
    unmount();
    expect(mockCancelRaf).toHaveBeenCalled();
  });

  it('createFaceLandmarker 失敗時に error がセットされる', async () => {
    mockCreateFaceLandmarker.mockRejectedValue(new Error('wasm init failed'));
    const videoRef = makeVideoRef();
    const { result } = renderHook(() => useFaceLandmarker(videoRef));
    await waitFor(() => expect(result.current.error).not.toBeNull());
    expect(result.current.isReady).toBe(false);
  });

  it('BlendShapeMapper.mapBlendShapes が arkit52 で呼ばれ smooth 済みの値を返す', async () => {
    const fakeArkit52 = { mouthSmileLeft: 0.8, mouthSmileRight: 0.8 };
    const smoothed = { ...zeroWeights, happy: 0.4 }; // lerp(0, 0.8, 0.5)
    mockDetect.mockReturnValue({ arkit52: fakeArkit52, lookAt: null });
    mockMapBlendShapes.mockReturnValue(smoothed);
    const videoRef = makeVideoRef();
    const { result } = renderHook(() => useFaceLandmarker(videoRef));
    await waitFor(() => expect(result.current.blendShapes).toEqual(smoothed));
    expect(mockMapBlendShapes).toHaveBeenCalledWith(fakeArkit52);
  });
});
