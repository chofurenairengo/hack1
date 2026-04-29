import { renderHook, waitFor, act } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { useFaceLandmarker } from '@/hooks/useFaceLandmarker';

const mocks = vi.hoisted(() => {
  const detect = vi.fn();
  const close = vi.fn();
  const handle = { detect, close };
  const createFaceLandmarker = vi.fn().mockResolvedValue(handle);
  return { detect, close, handle, createFaceLandmarker };
});

vi.mock('@/infrastructure/mediapipe/face-landmarker', () => ({
  createFaceLandmarker: mocks.createFaceLandmarker,
}));

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

const scheduledCallbacks: FrameRequestCallback[] = [];
let rafHandleCounter = 0;
const cafMock = vi.fn();

function flushRaf() {
  const toCall = [...scheduledCallbacks];
  scheduledCallbacks.length = 0;
  toCall.forEach((cb) => cb(performance.now()));
}

describe('useFaceLandmarker', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    scheduledCallbacks.length = 0;
    rafHandleCounter = 0;
    vi.stubGlobal(
      'requestAnimationFrame',
      vi.fn().mockImplementation((cb: FrameRequestCallback) => {
        scheduledCallbacks.push(cb);
        return ++rafHandleCounter;
      }),
    );
    vi.stubGlobal('cancelAnimationFrame', cafMock);
    mocks.createFaceLandmarker.mockResolvedValue(mocks.handle);
    mocks.detect.mockReturnValue(null);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('初期状態: isReady=false, blendShapes=null, error=null', () => {
    let resolveInit!: (h: typeof mocks.handle) => void;
    mocks.createFaceLandmarker.mockReturnValue(
      new Promise<typeof mocks.handle>((r) => {
        resolveInit = r;
      }),
    );

    const videoRef = { current: null };
    const { result } = renderHook(() => useFaceLandmarker(videoRef));

    expect(result.current.isReady).toBe(false);
    expect(result.current.blendShapes).toBeNull();
    expect(result.current.error).toBeNull();
  });

  it('createFaceLandmarker 成功後に isReady が true になる', async () => {
    const videoRef = { current: null };
    const { result } = renderHook(() => useFaceLandmarker(videoRef));

    await waitFor(() => expect(result.current.isReady).toBe(true));
  });

  it('createFaceLandmarker が "/mediapipe" で呼ばれる', async () => {
    const videoRef = { current: null };
    renderHook(() => useFaceLandmarker(videoRef));

    await waitFor(() => expect(mocks.createFaceLandmarker).toHaveBeenCalledWith('/mediapipe'));
  });

  it('videoRef.current が null のとき detect は呼ばれない', async () => {
    const videoRef = { current: null };
    const { result } = renderHook(() => useFaceLandmarker(videoRef));

    await waitFor(() => expect(result.current.isReady).toBe(true));
    act(() => {
      flushRaf();
    });

    expect(mocks.detect).not.toHaveBeenCalled();
  });

  it('video がセットされているとき detect を呼び blendShapes を更新する', async () => {
    const weights = { ...zeroWeights, happy: 0.8, aa: 0.5 };
    mocks.detect.mockReturnValue({ weights, lookAt: null });

    const video = document.createElement('video') as HTMLVideoElement;
    const videoRef = { current: video };

    const { result } = renderHook(() => useFaceLandmarker(videoRef));
    await waitFor(() => expect(result.current.isReady).toBe(true));

    act(() => {
      flushRaf();
    });

    expect(mocks.detect).toHaveBeenCalledWith(video, expect.any(Number));
    expect(result.current.blendShapes).toEqual(weights);
  });

  it('detect が null を返すとき blendShapes は null のまま', async () => {
    mocks.detect.mockReturnValue(null);

    const video = document.createElement('video') as HTMLVideoElement;
    const videoRef = { current: video };

    const { result } = renderHook(() => useFaceLandmarker(videoRef));
    await waitFor(() => expect(result.current.isReady).toBe(true));

    act(() => {
      flushRaf();
    });

    expect(result.current.blendShapes).toBeNull();
  });

  it('unmount 時に cancelAnimationFrame と handle.close が呼ばれる', async () => {
    const videoRef = { current: null };
    const { result, unmount } = renderHook(() => useFaceLandmarker(videoRef));

    await waitFor(() => expect(result.current.isReady).toBe(true));
    await waitFor(() => expect(scheduledCallbacks.length).toBeGreaterThan(0));

    unmount();

    expect(cafMock).toHaveBeenCalled();
    expect(mocks.close).toHaveBeenCalled();
  });

  it('Error で reject するとき error が error.message になる', async () => {
    mocks.createFaceLandmarker.mockRejectedValue(new Error('GPU init failed'));

    const videoRef = { current: null };
    const { result } = renderHook(() => useFaceLandmarker(videoRef));

    await waitFor(() => expect(result.current.error).toBe('GPU init failed'));
    expect(result.current.isReady).toBe(false);
  });

  it('非 Error で reject するとき error が fallback メッセージになる', async () => {
    mocks.createFaceLandmarker.mockRejectedValue('string error');

    const videoRef = { current: null };
    const { result } = renderHook(() => useFaceLandmarker(videoRef));

    await waitFor(() => expect(result.current.error).toBe('FaceLandmarker init failed'));
  });

  it('init 完了前に unmount しても resolve 後に handle.close が呼ばれる', async () => {
    let resolveCreate!: (h: typeof mocks.handle) => void;
    mocks.createFaceLandmarker.mockReturnValue(
      new Promise<typeof mocks.handle>((resolve) => {
        resolveCreate = resolve;
      }),
    );

    const videoRef = { current: null };
    const { unmount } = renderHook(() => useFaceLandmarker(videoRef));

    unmount();

    act(() => {
      resolveCreate(mocks.handle);
    });

    await waitFor(() => expect(mocks.close).toHaveBeenCalled());
  });
});
