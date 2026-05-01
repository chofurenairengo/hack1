'use client';

import { useState, useEffect, useRef, type RefObject } from 'react';
import {
  createFaceLandmarker,
  type FaceLandmarkerHandle,
} from '@/infrastructure/mediapipe/face-landmarker';
import { BlendShapeMapper } from '@/infrastructure/avatar/retarget';
import type { ExpressionPayload } from '@/domain/avatar/value-objects/expression.payload';

type BlendShapeWeights = ExpressionPayload['weights'];

export type UseFaceLandmarkerResult = Readonly<{
  blendShapes: BlendShapeWeights | null;
  isReady: boolean;
  error: string | null;
}>;

const WASM_BASE_PATH = '/mediapipe';

export function useFaceLandmarker(
  videoRef: RefObject<HTMLVideoElement | null>,
  targetFps = 30,
): UseFaceLandmarkerResult {
  const [blendShapes, setBlendShapes] = useState<BlendShapeWeights | null>(null);
  const [isReady, setIsReady] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleRef = useRef<FaceLandmarkerHandle | null>(null);
  const rafIdRef = useRef<number | null>(null);
  const mountedRef = useRef(true);
  const targetFpsRef = useRef(targetFps);
  const lastDetectRef = useRef(0);

  useEffect(() => {
    targetFpsRef.current = targetFps;
  }, [targetFps]);

  useEffect(() => {
    mountedRef.current = true;

    let active = true;

    createFaceLandmarker(WASM_BASE_PATH)
      .then((handle) => {
        if (!active) {
          handle.close();
          return;
        }
        handleRef.current = handle;
        setIsReady(true);
        startLoop(handle);
      })
      .catch((e: unknown) => {
        if (!active) return;
        setError(e instanceof Error ? e.message : 'FaceLandmarker init failed');
      });

    function startLoop(handle: FaceLandmarkerHandle) {
      const mapper = new BlendShapeMapper();
      function tick() {
        if (!active) return;
        const now = performance.now();
        const intervalMs = 1000 / targetFpsRef.current;
        const video = videoRef.current;
        if (video && now - lastDetectRef.current >= intervalMs) {
          lastDetectRef.current = now;
          const result = handle.detect(video, now);
          if (result && mountedRef.current) {
            setBlendShapes(mapper.mapBlendShapes(result.arkit52));
          }
        }
        rafIdRef.current = requestAnimationFrame(tick);
      }
      rafIdRef.current = requestAnimationFrame(tick);
    }

    return () => {
      active = false;
      mountedRef.current = false;
      if (rafIdRef.current !== null) {
        cancelAnimationFrame(rafIdRef.current);
        rafIdRef.current = null;
      }
      if (handleRef.current) {
        handleRef.current.close();
        handleRef.current = null;
      }
    };
  }, [videoRef]);

  return { blendShapes, isReady, error };
}
