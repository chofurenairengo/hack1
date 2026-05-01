'use client';

import { useState, useEffect, useRef } from 'react';

const FRAME_WINDOW = 60;
const DISABLE_EFFECTS_THRESHOLD = 24;
const DEGRADED_FPS_THRESHOLD = 25;
const DEGRADED_DURATION_MS = 3000;
const NORMAL_TARGET_FPS = 30;
const DEGRADED_TARGET_FPS = 10;

export type AvatarPerfState = Readonly<{
  fps: number;
  disableEffects: boolean;
  mediapipeTargetFps: number;
}>;

export function useAvatarPerf(): AvatarPerfState {
  const [fps, setFps] = useState(0);
  const [disableEffects, setDisableEffects] = useState(false);
  const [mediapipeTargetFps, setMediapipeTargetFps] = useState(NORMAL_TARGET_FPS);

  const frameTimestamps = useRef<number[]>([]);
  const lowFpsStartRef = useRef<number | null>(null);
  const rafIdRef = useRef<number | null>(null);

  useEffect(() => {
    let active = true;

    function tick(now: number) {
      if (!active) return;

      const ts = frameTimestamps.current;
      ts.push(now);
      if (ts.length > FRAME_WINDOW) ts.shift();

      if (ts.length >= 2) {
        const elapsed = ts[ts.length - 1]! - ts[0]!;
        const currentFps = ((ts.length - 1) / elapsed) * 1000;

        setFps(Math.round(currentFps));
        setDisableEffects(currentFps < DISABLE_EFFECTS_THRESHOLD);

        if (currentFps < DEGRADED_FPS_THRESHOLD) {
          if (lowFpsStartRef.current === null) {
            lowFpsStartRef.current = now;
          } else if (now - lowFpsStartRef.current >= DEGRADED_DURATION_MS) {
            setMediapipeTargetFps(DEGRADED_TARGET_FPS);
          }
        } else {
          lowFpsStartRef.current = null;
          setMediapipeTargetFps(NORMAL_TARGET_FPS);
        }
      }

      rafIdRef.current = requestAnimationFrame(tick);
    }

    rafIdRef.current = requestAnimationFrame(tick);

    return () => {
      active = false;
      if (rafIdRef.current !== null) {
        cancelAnimationFrame(rafIdRef.current);
        rafIdRef.current = null;
      }
      frameTimestamps.current = [];
      lowFpsStartRef.current = null;
    };
  }, []);

  return { fps, disableEffects, mediapipeTargetFps };
}
