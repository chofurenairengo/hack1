import { describe, it, expect, vi, beforeEach } from 'vitest';

const { mockCreateFromOptions, mockDetectForVideo, mockClose, mockForVisionTasks } = vi.hoisted(
  () => ({
    mockClose: vi.fn(),
    mockDetectForVideo: vi.fn(),
    mockForVisionTasks: vi.fn(),
    mockCreateFromOptions: vi.fn(),
  }),
);

vi.mock('@mediapipe/tasks-vision', () => ({
  FilesetResolver: { forVisionTasks: mockForVisionTasks },
  FaceLandmarker: { createFromOptions: mockCreateFromOptions },
}));

// jsdom canvas.getContext returns null — stub via prototype so createFaceLandmarker can drawImage
const mockDrawImage = vi.fn();
HTMLCanvasElement.prototype.getContext = vi.fn().mockReturnValue({
  drawImage: mockDrawImage,
}) as typeof HTMLCanvasElement.prototype.getContext;

import { createFaceLandmarker } from '@/infrastructure/mediapipe/face-landmarker';

const fakeFileset = { wasm: 'mock' };
const fakeLandmarker = { detectForVideo: mockDetectForVideo, close: mockClose };

function makeBlendshapes(overrides: Record<string, number> = {}) {
  const defaults: Record<string, number> = {
    mouthSmileLeft: 0,
    mouthSmileRight: 0,
    mouthFrownLeft: 0,
    mouthFrownRight: 0,
    browDownLeft: 0,
    browDownRight: 0,
    eyeWideLeft: 0,
    eyeWideRight: 0,
    browInnerUp: 0,
    cheekSquintLeft: 0,
    cheekSquintRight: 0,
    jawOpen: 0,
    mouthUpperUpLeft: 0,
    mouthUpperUpRight: 0,
    mouthPucker: 0,
    mouthFunnel: 0,
    mouthStretchLeft: 0,
    mouthStretchRight: 0,
    mouthLowerDownLeft: 0,
    mouthLowerDownRight: 0,
  };
  return Object.entries({ ...defaults, ...overrides }).map(([categoryName, score]) => ({
    categoryName,
    score,
  }));
}

function fakeVideo(readyState = 4) {
  return { readyState } as unknown as HTMLVideoElement;
}

function setupInit() {
  mockForVisionTasks.mockResolvedValue(fakeFileset);
  mockCreateFromOptions.mockResolvedValue(fakeLandmarker);
}

describe('createFaceLandmarker', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    setupInit();
  });

  it('正常初期化で handle を返す', async () => {
    const handle = await createFaceLandmarker('/mediapipe');
    expect(handle).toBeDefined();
    expect(typeof handle.detect).toBe('function');
    expect(typeof handle.close).toBe('function');
    expect(mockCreateFromOptions).toHaveBeenCalledOnce();
  });

  it('GPU delegate を先に試みる', async () => {
    await createFaceLandmarker('/mediapipe');
    const opts = mockCreateFromOptions.mock.calls[0]![1]!;
    expect(opts.baseOptions.delegate).toBe('GPU');
  });

  it('GPU 初期化失敗時に CPU へフォールバックする', async () => {
    mockCreateFromOptions
      .mockRejectedValueOnce(new Error('GPU unavailable'))
      .mockResolvedValueOnce(fakeLandmarker);

    const handle = await createFaceLandmarker('/mediapipe');
    expect(handle).toBeDefined();
    expect(mockCreateFromOptions).toHaveBeenCalledTimes(2);
    const cpuOpts = mockCreateFromOptions.mock.calls[1]![1]!;
    expect(cpuOpts.baseOptions.delegate).toBe('CPU');
  });

  it('両 delegate が失敗した場合はエラーを throw する', async () => {
    mockCreateFromOptions.mockRejectedValue(new Error('init fail'));
    await expect(createFaceLandmarker('/mediapipe')).rejects.toThrow();
  });
});

describe('FaceLandmarkerHandle.detect', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    setupInit();
  });

  it('顔が検出されない場合は null を返す', async () => {
    mockDetectForVideo.mockReturnValue({ faceBlendshapes: [] });
    const handle = await createFaceLandmarker('/mediapipe');
    expect(handle.detect(fakeVideo(), 100)).toBeNull();
  });

  it('blendshapes を weights にマッピングする', async () => {
    mockDetectForVideo.mockReturnValue({
      faceBlendshapes: [
        {
          categories: makeBlendshapes({
            mouthSmileLeft: 0.8,
            mouthSmileRight: 0.6,
            jawOpen: 0.5,
          }),
        },
      ],
      facialTransformationMatrixes: [],
    });
    const handle = await createFaceLandmarker('/mediapipe');
    const result = handle.detect(fakeVideo(), 100);
    expect(result).not.toBeNull();
    expect(result!.weights.happy).toBeCloseTo(0.7, 2);
    expect(result!.weights.aa).toBeCloseTo(0.5, 2);
  });

  it('weights は 0..1 にクランプされる', async () => {
    mockDetectForVideo.mockReturnValue({
      faceBlendshapes: [
        {
          categories: makeBlendshapes({ mouthSmileLeft: 1.5, mouthSmileRight: 1.2 }),
        },
      ],
      facialTransformationMatrixes: [],
    });
    const handle = await createFaceLandmarker('/mediapipe');
    const result = handle.detect(fakeVideo(), 100);
    expect(result!.weights.happy).toBeLessThanOrEqual(1);
  });

  it('video.readyState < 2 の場合は null を返す', async () => {
    const handle = await createFaceLandmarker('/mediapipe');
    expect(handle.detect(fakeVideo(1), 100)).toBeNull();
  });
});

describe('FaceLandmarkerHandle.close', () => {
  it('close() で FaceLandmarker.close を呼ぶ', async () => {
    setupInit();
    const handle = await createFaceLandmarker('/mediapipe');
    handle.close();
    expect(mockClose).toHaveBeenCalledOnce();
  });
});
