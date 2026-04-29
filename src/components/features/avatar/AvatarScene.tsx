'use client';

import { useRef, useEffect, useState, useCallback } from 'react';
import type { EventId, PairId, UserId } from '@/shared/types/ids';
import { useAvatarSync } from '@/hooks/useAvatarSync';
import { useFaceLandmarker } from '@/hooks/useFaceLandmarker';
import { getPresetByKey, type AvatarPresetKey } from '@/infrastructure/vrm/preset-registry';
import { AvatarCanvas } from './AvatarCanvas';
import { AvatarTile } from './AvatarTile';
import type { ExpressionPayload } from '@/domain/avatar/value-objects/expression.payload';

const EMIT_INTERVAL_MS = 33;
const REDUCED_MOTION_THRESHOLD = 0.3;

const DEFAULT_WEIGHTS: ExpressionPayload['weights'] = {
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

interface AvatarSceneProps {
  eventId: EventId;
  pairId: PairId;
  selfUserId: UserId;
  selfPresetKey: AvatarPresetKey;
}

export function AvatarScene({ eventId, pairId, selfUserId, selfPresetKey }: AvatarSceneProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const lastEmitRef = useRef<number>(0);
  const streamRef = useRef<MediaStream | null>(null);

  const [prefersReducedMotion] = useState(
    () =>
      typeof window !== 'undefined' &&
      window.matchMedia('(prefers-reduced-motion: reduce)').matches,
  );
  const [cameraError, setCameraError] = useState<string | null>(null);

  const { blendShapes } = useFaceLandmarker(videoRef);
  const { emit } = useAvatarSync(eventId, pairId);

  const preset = getPresetByKey(selfPresetKey);

  const tryEmit = useCallback(() => {
    if (!blendShapes) return;

    const maxWeight = Math.max(...Object.values(blendShapes));
    if (prefersReducedMotion && maxWeight < REDUCED_MOTION_THRESHOLD) return;

    const now = Date.now();
    if (now - lastEmitRef.current < EMIT_INTERVAL_MS) return;

    lastEmitRef.current = now;
    const payload: ExpressionPayload = {
      userId: selfUserId,
      weights: blendShapes,
      lookAt: null,
      ts: now,
    };
    emit(payload);
  }, [blendShapes, emit, selfUserId, prefersReducedMotion]);

  useEffect(() => {
    tryEmit();
  }, [tryEmit]);

  useEffect(() => {
    let active = true;

    navigator.mediaDevices
      ?.getUserMedia({ video: true, audio: false })
      .then((stream) => {
        if (!active) {
          stream.getTracks().forEach((t) => t.stop());
          return;
        }
        streamRef.current = stream;
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
        }
      })
      .catch(() => {
        if (!active) return;
        setCameraError('カメラへのアクセスが許可されていません');
      });

    return () => {
      active = false;
      streamRef.current?.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    };
  }, []);

  if (!preset) {
    return <div aria-label="アバター読み込みエラー" />;
  }

  if (cameraError) {
    return <div role="alert" aria-label={cameraError} />;
  }

  return (
    <>
      <video ref={videoRef} autoPlay playsInline muted style={{ display: 'none' }} />
      <AvatarCanvas>
        <AvatarTile vrmUrl={preset.vrmUrl} weights={blendShapes ?? DEFAULT_WEIGHTS} lookAt={null} />
      </AvatarCanvas>
    </>
  );
}
