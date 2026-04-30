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
const AA_AUDIO_WEIGHT = 0.3;
const AA_FACE_WEIGHT = 0.7;

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
  const audioStreamRef = useRef<MediaStream | null>(null);

  const [prefersReducedMotion] = useState(
    () =>
      typeof window !== 'undefined' &&
      window.matchMedia('(prefers-reduced-motion: reduce)').matches,
  );
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [audioStream, setAudioStream] = useState<MediaStream | null>(null);

  const { blendShapes } = useFaceLandmarker(videoRef);
  const { emit } = useAvatarSync(eventId, pairId);
  const { rms } = useLipSync(audioStream);

  const preset = getPresetByKey(selfPresetKey);

  const tryEmit = useCallback(() => {
    if (!blendShapes) return;

    const blendedAa = prefersReducedMotion
      ? 0
      : Math.max(0, Math.min(1, AA_FACE_WEIGHT * blendShapes.aa + AA_AUDIO_WEIGHT * rms));
    const weights: ExpressionPayload['weights'] = {
      ...blendShapes,
      aa: Math.round(blendedAa * 100) / 100,
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

  useEffect(() => {
    let active = true;

    navigator.mediaDevices
      ?.getUserMedia({ video: false, audio: true })
      .then((stream) => {
        if (!active) {
          stream.getTracks().forEach((t) => t.stop());
          return;
        }
        audioStreamRef.current = stream;
        setAudioStream(stream);
      })
      .catch(() => {
        // マイク拒否は無視 — 口パクなしで続行
      });

    return () => {
      active = false;
      audioStreamRef.current?.getTracks().forEach((t) => t.stop());
      audioStreamRef.current = null;
      setAudioStream(null);
    };
  }, []);

  if (!preset) {
    return <div role="alert">アバターを読み込めませんでした</div>;
  }

  if (cameraError) {
    return <div role="alert">{cameraError}</div>;
  }

  const selfBlendedAa = prefersReducedMotion
    ? 0
    : Math.max(0, Math.min(1, AA_FACE_WEIGHT * (blendShapes?.aa ?? 0) + AA_AUDIO_WEIGHT * rms));
  const selfWeights: ExpressionPayload['weights'] = blendShapes
    ? { ...blendShapes, aa: Math.round(selfBlendedAa * 100) / 100 }
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
