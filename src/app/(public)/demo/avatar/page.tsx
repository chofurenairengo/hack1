'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { useLipSync } from '@/hooks/useLipSync';
import Image from 'next/image';
import { Box3 } from 'three';
import { PerspectiveCamera } from '@react-three/drei';
import type { VRM } from '@pixiv/three-vrm';
import { AvatarCanvas } from '@/components/features/avatar/AvatarCanvas';
import { AvatarTile } from '@/components/features/avatar/AvatarTile';
import { AVATAR_PRESETS } from '@/infrastructure/vrm/preset-registry';
import type { AvatarPreset } from '@/domain/avatar/entities/avatar-preset.entity';
import type { ExpressionPayload } from '@/domain/avatar/value-objects/expression.payload';

const EXPRESSION_KEYS = ['happy', 'sad', 'angry', 'relaxed', 'surprised'] as const;
type ExpressionKey = (typeof EXPRESSION_KEYS)[number];

const ZERO_WEIGHTS: ExpressionPayload['weights'] = {
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

const DEFAULT_HEAD_Y = 1.45;

export default function AvatarDemoPage() {
  const [selectedPreset, setSelectedPreset] = useState<AvatarPreset>(AVATAR_PRESETS[0]!);
  const [weights, setWeights] = useState<ExpressionPayload['weights']>(ZERO_WEIGHTS);
  const [headY, setHeadY] = useState(DEFAULT_HEAD_Y);
  const [unavailableExprs, setUnavailableExprs] = useState<ReadonlySet<ExpressionKey>>(new Set());
  const [loadError, setLoadError] = useState<string | null>(null);
  const [micError, setMicError] = useState<string | null>(null);
  const [audioStream, setAudioStream] = useState<MediaStream | null>(null);
  const audioStreamRef = useRef<MediaStream | null>(null);
  const { rms } = useLipSync(audioStream);

  const startMic = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true, video: false });
      audioStreamRef.current = stream;
      setAudioStream(stream);
      setMicError(null);
    } catch (err: unknown) {
      const isPermissionDenied =
        err instanceof DOMException &&
        (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError');
      setMicError(
        isPermissionDenied
          ? 'マイクの使用が拒否されています。ブラウザのアドレスバー左の鍵アイコンからマイクを「許可」してリロードしてください。'
          : 'マイクにアクセスできませんでした。デバイスが接続されているか確認してください。',
      );
    }
  }, []);

  const stopMic = useCallback(() => {
    audioStreamRef.current?.getTracks().forEach((t) => t.stop());
    audioStreamRef.current = null;
    setAudioStream(null);
  }, []);

  useEffect(() => () => stopMic(), [stopMic]);

  const handleAvatarLoad = useCallback((vrm: VRM) => {
    const bbox = new Box3().setFromObject(vrm.scene);
    const height = bbox.max.y - bbox.min.y;
    setHeadY(height > 0.1 ? bbox.min.y + height * 0.9 : DEFAULT_HEAD_Y);

    const missing = new Set(
      EXPRESSION_KEYS.filter((key) => !vrm.expressionManager?.getExpression(key)),
    );
    setUnavailableExprs(missing);
  }, []);

  const handleWeightChange = (key: ExpressionKey, value: number) => {
    setWeights((prev) => ({ ...prev, [key]: value }));
  };

  const handlePresetSelect = (preset: AvatarPreset) => {
    setSelectedPreset(preset);
    setWeights(ZERO_WEIGHTS);
    setHeadY(DEFAULT_HEAD_Y);
    setUnavailableExprs(new Set());
    setLoadError(null);
  };

  const AA_AUDIO_WEIGHT = 5.0;
  const AA_FACE_WEIGHT = 0.7;
  const blendedAa = audioStream
    ? Math.max(0, Math.min(1, AA_FACE_WEIGHT * weights.aa + AA_AUDIO_WEIGHT * rms))
    : weights.aa;
  const displayWeights = { ...weights, aa: Math.round(blendedAa * 100) / 100 };

  return (
    <div className="min-h-screen bg-gray-950 text-white p-6">
      <h1 className="text-2xl font-bold mb-6">VRM アバター デモ</h1>

      <div className="flex gap-3 mb-6 flex-wrap">
        {AVATAR_PRESETS.map((preset) => (
          <button
            key={preset.key}
            onClick={() => handlePresetSelect(preset)}
            aria-pressed={selectedPreset.key === preset.key}
            className={`flex flex-col items-center gap-1 p-2 rounded-lg border transition-colors ${
              selectedPreset.key === preset.key
                ? 'border-blue-500 bg-blue-900/40'
                : 'border-gray-700 hover:border-gray-500'
            }`}
          >
            <Image
              src={preset.thumbnailUrl}
              alt={preset.displayName}
              width={64}
              height={64}
              className="rounded object-cover"
            />
            <span className="text-xs text-gray-300">{preset.displayName}</span>
          </button>
        ))}
      </div>

      <AvatarCanvas className="w-full h-[500px] rounded-xl overflow-hidden bg-gray-900 mb-6">
        <PerspectiveCamera makeDefault position={[0, headY, 0.6]} fov={28} />
        <group rotation={[0, Math.PI, 0]}>
          <AvatarTile
            vrmUrl={selectedPreset.vrmUrl}
            weights={displayWeights}
            onLoad={handleAvatarLoad}
            onError={setLoadError}
          />
        </group>
      </AvatarCanvas>
      {loadError && (
        <p role="alert" aria-atomic="true" className="mt-2 text-sm text-red-400">
          VRM ロード失敗: {loadError}
        </p>
      )}

      <div className="max-w-md space-y-4">
        <h2 className="text-lg font-semibold">表情</h2>
        {EXPRESSION_KEYS.map((key) => {
          const unavailable = unavailableExprs.has(key);
          return (
            <div key={key} className="flex items-center gap-3">
              <label
                htmlFor={`weight-${key}`}
                className={`w-20 text-sm ${unavailable ? 'text-gray-600 line-through' : 'text-gray-400'}`}
              >
                {key}
              </label>
              <input
                id={`weight-${key}`}
                type="range"
                min={0}
                max={1}
                step={0.01}
                value={weights[key]}
                disabled={unavailable}
                onChange={(e) => handleWeightChange(key, parseFloat(e.target.value))}
                className="flex-1 disabled:opacity-30"
              />
              <span className="w-10 text-right text-sm text-gray-400">
                {unavailable ? '—' : weights[key].toFixed(2)}
              </span>
            </div>
          );
        })}
      </div>

      <div className="max-w-md mt-6">
        <h2 className="text-lg font-semibold mb-3">リップシンク</h2>
        <div className="flex items-center gap-4 mb-2">
          {audioStream ? (
            <button onClick={stopMic} className="px-4 py-1.5 rounded bg-red-600 text-white text-sm">
              停止
            </button>
          ) : (
            <button
              onClick={startMic}
              className="px-4 py-1.5 rounded bg-indigo-600 text-white text-sm"
            >
              🎤 マイクを開始
            </button>
          )}
        </div>
        {micError && (
          <p role="alert" aria-atomic="true" className="mt-1 text-sm text-red-400">
            {micError}
          </p>
        )}
        {audioStream && (
          <div className="space-y-1 text-sm text-gray-300">
            <div className="flex items-center gap-2">
              <span className="w-16">RMS</span>
              <div className="flex-1 bg-gray-700 rounded h-2">
                <div
                  className="bg-green-400 h-2 rounded"
                  style={{ width: `${Math.min(100, rms * 100)}%` }}
                />
              </div>
              <span className="w-10 text-right">{rms.toFixed(2)}</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="w-16">aa (blend)</span>
              <div className="flex-1 bg-gray-700 rounded h-2">
                <div
                  className="bg-yellow-400 h-2 rounded"
                  style={{ width: `${Math.min(100, blendedAa * 100)}%` }}
                />
              </div>
              <span className="w-10 text-right">{blendedAa.toFixed(2)}</span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
