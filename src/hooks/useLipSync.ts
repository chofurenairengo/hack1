'use client';

import { useEffect, useRef, useState } from 'react';
import {
  createLipSyncAnalyzer,
  type LipSyncAnalyzerHandle,
} from '@/infrastructure/mediapipe/lip-sync-analyzer';

const RMS_UPDATE_INTERVAL_MS = 50;
const RMS_UPDATE_THRESHOLD = 0.01;

export type UseLipSyncResult = Readonly<{ rms: number }>;

export function useLipSync(audioStream: MediaStream | null): UseLipSyncResult {
  const [rms, setRms] = useState(0);
  const analyzerRef = useRef<LipSyncAnalyzerHandle | null>(null);
  const rafIdRef = useRef<number | null>(null);

  useEffect(() => {
    if (!audioStream) return;

    const analyzer = createLipSyncAnalyzer(audioStream);
    analyzerRef.current = analyzer;
    let active = true;
    let lastPublishedAt = 0;
    let lastPublishedRms = 0;

    function tick() {
      if (!active) return;
      const nextRms = analyzer.getRms();
      const now = performance.now();
      if (
        now - lastPublishedAt >= RMS_UPDATE_INTERVAL_MS &&
        Math.abs(nextRms - lastPublishedRms) >= RMS_UPDATE_THRESHOLD
      ) {
        lastPublishedAt = now;
        lastPublishedRms = nextRms;
        setRms(nextRms);
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
      analyzer.close();
      analyzerRef.current = null;
      setRms(0);
    };
  }, [audioStream]);

  return { rms };
}
