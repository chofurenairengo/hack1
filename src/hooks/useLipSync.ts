'use client';

import { useEffect, useRef, useState } from 'react';
import {
  createLipSyncAnalyzer,
  type LipSyncAnalyzerHandle,
} from '@/infrastructure/mediapipe/lip-sync-analyzer';

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

    function tick() {
      if (!active) return;
      setRms(analyzer.getRms());
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
    };
  }, [audioStream]);

  return { rms };
}
