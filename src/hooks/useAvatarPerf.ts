'use client';

import { useState, useEffect, useRef } from 'react';

const FRAME_WINDOW = 60;

const DISABLE_EFFECTS_THRESHOLD = 24;
const ENABLE_EFFECTS_THRESHOLD = 30;

const DEGRADED_FPS_THRESHOLD = 25;
const RECOVERY_FPS_THRESHOLD = 30;
const DEGRADED_DURATION_MS = 3000;

const NORMAL_TARGET_FPS = 30;
const DEGRADED_TARGET_FPS = 10;

const FPS_UPDATE_INTERVAL_MS = 1000;

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
  const lastFpsUpdateRef = useRef<number | null>(null);
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

        if (
          lastFpsUpdateRef.current === null ||
          now - lastFpsUpdateRef.current >= FPS_UPDATE_INTERVAL_MS
        ) {
          setFps(Math.round(currentFps));
          lastFpsUpdateRef.current = now;
        }

        if (currentFps < DISABLE_EFFECTS_THRESHOLD) {
          setDisableEffects(true);
        } else if (currentFps >= ENABLE_EFFECTS_THRESHOLD) {
          setDisableEffects(false);
        }

        if (currentFps < DEGRADED_FPS_THRESHOLD) {
          if (lowFpsStartRef.current === null) {
            lowFpsStartRef.current = now;
          } else if (now - lowFpsStartRef.current >= DEGRADED_DURATION_MS) {
            setMediapipeTargetFps(DEGRADED_TARGET_FPS);
          }
        } else if (currentFps >= RECOVERY_FPS_THRESHOLD) {
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
      lastFpsUpdateRef.current = null;
    };
  }, []);

  return { fps, disableEffects, mediapipeTargetFps };
}
