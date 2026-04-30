import { FaceLandmarker, FilesetResolver } from '@mediapipe/tasks-vision';
import type { BlendShapeMap } from '@/infrastructure/avatar/retarget';

/** Maximum input side length passed to MediaPipe (FPS優先) */
const INFER_SIZE = 192;

export type FaceDetectResult = Readonly<{
  arkit52: BlendShapeMap;
  lookAt: { x: number; y: number } | null;
}>;

export type FaceLandmarkerHandle = Readonly<{
  detect: (video: HTMLVideoElement, nowMs: number) => FaceDetectResult | null;
  close: () => void;
}>;

// ---------------------------------------------------------------------------
// ARKit52 score map helper
// ---------------------------------------------------------------------------

function buildScoreMap(
  categories: ReadonlyArray<{ categoryName: string; score: number }>,
): BlendShapeMap {
  const map: Record<string, number> = {};
  for (const c of categories) map[c.categoryName] = c.score;
  return map;
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
    return { arkit52: buildScoreMap(raw.faceBlendshapes[0].categories), lookAt: null };
  }

  function close(): void {
    landmarker.close();
  }

  return { detect, close };
}
