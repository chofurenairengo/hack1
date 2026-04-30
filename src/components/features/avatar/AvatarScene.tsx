'use client';

import { useRef, useEffect, useState, useCallback } from 'react';
import type { EventId, PairId, UserId } from '@/shared/types/ids';
import { useAvatarSync } from '@/hooks/useAvatarSync';
import { useFaceLandmarker } from '@/hooks/useFaceLandmarker';
import { useLipSync } from '@/hooks/useLipSync';
import { getPresetByKey, type AvatarPresetKey } from '@/infrastructure/vrm/preset-registry';
import { AvatarCanvas } from './AvatarCanvas';
import { AvatarTile } from './AvatarTile';
import type { ExpressionPayload } from '@/domain/avatar/value-objects/expression.payload';

const EMIT_INTERVAL_MS = 33;
const REDUCED_MOTION_THRESHOLD = 0.3;
const AA_AUDIO_WEIGHT = 5.0;
const AA_FACE_WEIGHT = 0.7;

function blendAa(faceAa: number, rms: number, prefersReducedMotion: boolean): number {
  if (prefersReducedMotion) return 0;
  const raw = AA_FACE_WEIGHT * faceAa + AA_AUDIO_WEIGHT * rms;
  return Math.round(Math.max(0, Math.min(1, raw)) * 100) / 100;
}

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
  audioStream?: MediaStream | null;
}

export function AvatarScene({
  eventId,
  pairId,
  selfUserId,
  selfPresetKey,
  audioStream = null,
}: AvatarSceneProps) {
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
  const { rms } = useLipSync(audioStream);

  const preset = getPresetByKey(selfPresetKey);

  const tryEmit = useCallback(() => {
    if (!blendShapes) return;

    const weights: ExpressionPayload['weights'] = {
      ...blendShapes,
      aa: blendAa(blendShapes.aa, rms, prefersReducedMotion),
    };

    const maxWeight = Math.max(...Object.values(weights));
    if (prefersReducedMotion && maxWeight < REDUCED_MOTION_THRESHOLD) return;

    const now = Date.now();
    if (now - lastEmitRef.current < EMIT_INTERVAL_MS) return;

    lastEmitRef.current = now;
    const payload: ExpressionPayload = {
      userId: selfUserId,
      weights,
      lookAt: null,
      ts: now,
    };
    emit(payload);
  }, [blendShapes, rms, emit, selfUserId, prefersReducedMotion]);

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
    return <div role="alert">アバターを読み込めませんでした</div>;
  }

  if (cameraError) {
    return <div role="alert">{cameraError}</div>;
  }

  const selfWeights: ExpressionPayload['weights'] = blendShapes
    ? { ...blendShapes, aa: blendAa(blendShapes.aa, rms, prefersReducedMotion) }
    : DEFAULT_WEIGHTS;

  return (
    <>
      <video ref={videoRef} autoPlay playsInline muted style={{ display: 'none' }} />
      <AvatarCanvas>
        <AvatarTile vrmUrl={preset.vrmUrl} weights={selfWeights} />
      </AvatarCanvas>
    </>
  );
}
