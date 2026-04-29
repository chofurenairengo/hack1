import { FaceLandmarker, FilesetResolver } from '@mediapipe/tasks-vision';
import type { ExpressionPayload } from '@/domain/avatar/value-objects/expression.payload';

/** Maximum input side length passed to MediaPipe (FPS優先) */
const INFER_SIZE = 192;

type BlendShapeWeights = ExpressionPayload['weights'];

export type FaceDetectResult = Readonly<{
  weights: BlendShapeWeights;
  lookAt: { x: number; y: number } | null;
}>;

export type FaceLandmarkerHandle = Readonly<{
  detect: (video: HTMLVideoElement, nowMs: number) => FaceDetectResult | null;
  close: () => void;
}>;

// ---------------------------------------------------------------------------
// Blendshape mapping helpers
// ---------------------------------------------------------------------------

function avg(a: number, b: number): number {
  return (a + b) / 2;
}

function clamp01(v: number): number {
  return Math.max(0, Math.min(1, v));
}

function buildScoreMap(categories: ReadonlyArray<{ categoryName: string; score: number }>) {
  const map: Record<string, number> = {};
  for (const c of categories) map[c.categoryName] = c.score;
  return map;
}

function mapWeights(
  categories: ReadonlyArray<{ categoryName: string; score: number }>,
): BlendShapeWeights {
  const s = buildScoreMap(categories);
  const g = (k: string) => s[k] ?? 0;
  return {
    happy: clamp01(avg(g('mouthSmileLeft'), g('mouthSmileRight'))),
    sad: clamp01(avg(g('mouthFrownLeft'), g('mouthFrownRight'))),
    angry: clamp01(avg(g('browDownLeft'), g('browDownRight'))),
    surprised: clamp01(avg(avg(g('eyeWideLeft'), g('eyeWideRight')), g('browInnerUp'))),
    relaxed: clamp01(avg(g('cheekSquintLeft'), g('cheekSquintRight'))),
    aa: clamp01(g('jawOpen')),
    ih: clamp01(avg(g('mouthUpperUpLeft'), g('mouthUpperUpRight'))),
    ou: clamp01(avg(g('mouthPucker'), g('mouthFunnel'))),
    ee: clamp01(avg(g('mouthStretchLeft'), g('mouthStretchRight'))),
    oh: clamp01(avg(g('mouthLowerDownLeft'), g('mouthLowerDownRight'))),
  };
}

// ---------------------------------------------------------------------------
// 192×192 downscale canvas (reused across frames)
// ---------------------------------------------------------------------------

function makeInferCanvas(): HTMLCanvasElement {
  const c = document.createElement('canvas');
  c.width = INFER_SIZE;
  c.height = INFER_SIZE;
  return c;
}

// ---------------------------------------------------------------------------
// FaceLandmarker initialization
// ---------------------------------------------------------------------------

async function tryCreate(
  resolver: Awaited<ReturnType<typeof FilesetResolver.forVisionTasks>>,
  delegate: 'GPU' | 'CPU',
  modelPath: string,
): Promise<FaceLandmarker> {
  return FaceLandmarker.createFromOptions(resolver, {
    baseOptions: { modelAssetPath: modelPath, delegate },
    outputFaceBlendshapes: true,
    runningMode: 'VIDEO',
    numFaces: 1,
  });
}

export async function createFaceLandmarker(
  wasmBasePath = '/mediapipe',
): Promise<FaceLandmarkerHandle> {
  const modelPath = `${wasmBasePath}/face_landmarker.task`;
  const resolver = await FilesetResolver.forVisionTasks(wasmBasePath);

  let landmarker: FaceLandmarker;
  try {
    landmarker = await tryCreate(resolver, 'GPU', modelPath);
  } catch {
    landmarker = await tryCreate(resolver, 'CPU', modelPath);
  }

  const canvas = makeInferCanvas();
  const ctx = canvas.getContext('2d');

  function detect(video: HTMLVideoElement, nowMs: number): FaceDetectResult | null {
    if (video.readyState < 2) return null;
    if (ctx) ctx.drawImage(video, 0, 0, INFER_SIZE, INFER_SIZE);
    const raw = landmarker.detectForVideo(ctx ? canvas : video, nowMs);
    if (!raw.faceBlendshapes?.[0]) return null;
    const weights = mapWeights(raw.faceBlendshapes[0].categories);
    return { weights, lookAt: null };
  }

  function close(): void {
    landmarker.close();
  }

  return { detect, close };
}
