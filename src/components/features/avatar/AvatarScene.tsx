'use client';

import { useRef, useEffect, useState, useCallback } from 'react';
import type { EventId, PairId, UserId } from '@/shared/types/ids';
import { useAvatarSync } from '@/hooks/useAvatarSync';
import { useAvatarPerf } from '@/hooks/useAvatarPerf';
import { useFaceLandmarker } from '@/hooks/useFaceLandmarker';
import { useLipSync } from '@/hooks/useLipSync';
import { useCameraPermission } from '@/hooks/useCameraPermission';
import { getPresetByKey, type AvatarPresetKey } from '@/infrastructure/vrm/preset-registry';
import { AvatarCanvas } from './AvatarCanvas';
import { AvatarTile } from './AvatarTile';
import type { ExpressionPayload } from '@/domain/avatar/value-objects/expression.payload';

const EMIT_INTERVAL_MS = 33;
const AA_AUDIO_WEIGHT = 5.0;
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

  const [prefersReducedMotion, setPrefersReducedMotion] = useState(
    () =>
      typeof window !== 'undefined' &&
      window.matchMedia('(prefers-reduced-motion: reduce)').matches,
  );

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)');
    const handler = (e: MediaQueryListEvent) => setPrefersReducedMotion(e.matches);
    mq.addEventListener('change', handler);
    return () => mq.removeEventListener('change', handler);
  }, []);

  const [cameraError, setCameraError] = useState(false);

  const { permissionState, requestPermission } = useCameraPermission();
  const { mediapipeTargetFps, disableEffects } = useAvatarPerf();
  const { blendShapes } = useFaceLandmarker(videoRef, mediapipeTargetFps);
  const { emit } = useAvatarSync(eventId, pairId);
  const { rms } = useLipSync(audioStream);

  const preset = getPresetByKey(selfPresetKey);

  useEffect(() => {
    if (permissionState !== 'granted') return;

    let active = true;

    navigator.mediaDevices
      ?.getUserMedia({ video: true, audio: false })
      .then((stream) => {
        if (!active) {
          stream.getTracks().forEach((t) => t.stop());
          return;
        }
        setCameraError(false);
        streamRef.current = stream;
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
        }
      })
      .catch(() => {
        if (active) setCameraError(true);
      });

    return () => {
      active = false;
      streamRef.current?.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    };
  }, [permissionState]);

  const tryEmit = useCallback(() => {
    if (prefersReducedMotion || !blendShapes) return;

    const now = Date.now();
    if (now - lastEmitRef.current < EMIT_INTERVAL_MS) return;

    lastEmitRef.current = now;
    const raw = AA_FACE_WEIGHT * blendShapes.aa + AA_AUDIO_WEIGHT * rms;
    const aa = Math.round(Math.max(0, Math.min(1, raw)) * 100) / 100;
    const payload: ExpressionPayload = {
      userId: selfUserId,
      weights: { ...blendShapes, aa },
      lookAt: null,
      ts: now,
    };
    emit(payload);
  }, [blendShapes, rms, emit, selfUserId, prefersReducedMotion]);

  useEffect(() => {
    tryEmit();
  }, [tryEmit]);

  if (!preset) {
    return <div role="alert">アバターを読み込めませんでした</div>;
  }

  if (permissionState === 'checking') {
    return <div role="status">カメラを確認中...</div>;
  }

  if (permissionState === 'prompt') {
    return (
      <div className="flex flex-col items-center gap-4 p-4">
        <p className="text-sm text-gray-700">顔の表情を追従させるためカメラを使用します</p>
        <button
          onClick={requestPermission}
          className="rounded-lg bg-indigo-600 px-4 py-2 text-sm text-white hover:bg-indigo-700"
        >
          カメラを許可する
        </button>
        <AvatarCanvas disableEffects>
          <AvatarTile
            vrmUrl={preset.vrmUrl}
            weights={DEFAULT_WEIGHTS}
            reducedMotion={prefersReducedMotion}
          />
        </AvatarCanvas>
      </div>
    );
  }

  if (permissionState === 'denied' || permissionState === 'unsupported') {
    return (
      <div className="relative">
        <AvatarCanvas disableEffects>
          <AvatarTile
            vrmUrl={preset.vrmUrl}
            weights={DEFAULT_WEIGHTS}
            reducedMotion={prefersReducedMotion}
          />
        </AvatarCanvas>
        <div
          role="status"
          className="absolute bottom-2 left-1/2 -translate-x-1/2 rounded-full bg-gray-100 px-3 py-1 text-xs text-gray-600"
        >
          音声のみで参加中
        </div>
      </div>
    );
  }

  if (cameraError) {
    return (
      <div className="relative">
        <AvatarCanvas disableEffects>
          <AvatarTile
            vrmUrl={preset.vrmUrl}
            weights={DEFAULT_WEIGHTS}
            reducedMotion={prefersReducedMotion}
          />
        </AvatarCanvas>
        <div
          role="status"
          className="absolute bottom-2 left-1/2 -translate-x-1/2 rounded-full bg-gray-100 px-3 py-1 text-xs text-gray-600"
        >
          音声のみで参加中
        </div>
      </div>
    );
  }

  // permissionState === 'granted'
  const selfWeights: ExpressionPayload['weights'] =
    prefersReducedMotion || !blendShapes
      ? DEFAULT_WEIGHTS
      : {
          ...blendShapes,
          aa:
            Math.round(
              Math.max(0, Math.min(1, AA_FACE_WEIGHT * blendShapes.aa + AA_AUDIO_WEIGHT * rms)) *
                100,
            ) / 100,
        };

  return (
    <>
      <video ref={videoRef} autoPlay playsInline muted style={{ display: 'none' }} />
      <AvatarCanvas disableEffects={disableEffects}>
        <AvatarTile
          vrmUrl={preset.vrmUrl}
          weights={selfWeights}
          reducedMotion={prefersReducedMotion}
        />
      </AvatarCanvas>
    </>
  );
}
