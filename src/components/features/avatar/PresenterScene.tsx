'use client';

import React, { useState, useEffect } from 'react';
import type { EventId, PairId, UserId } from '@/shared/types/ids';
import { useAvatarSync } from '@/hooks/useAvatarSync';
import { getPresetByKey, type AvatarPresetKey } from '@/infrastructure/vrm/preset-registry';
import { AvatarCanvas } from './AvatarCanvas';
import { AvatarTile } from './AvatarTile';
import type { ExpressionPayload } from '@/domain/avatar/value-objects/expression.payload';

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

interface PresenterSceneProps {
  eventId: EventId;
  pairId: PairId;
  presenterUserId: UserId;
  presenteeUserId: UserId;
  presenterPresetKey: AvatarPresetKey;
  presenteePresetKey: AvatarPresetKey;
  /** Lane A の <SlideRenderer> を受け取るスロット。未提供時はプレースホルダーを表示。 */
  slideContent?: React.ReactNode;
}

export function PresenterScene({
  eventId,
  pairId,
  presenterUserId,
  presenteeUserId,
  presenterPresetKey,
  presenteePresetKey,
  slideContent,
}: PresenterSceneProps) {
  const { expressions } = useAvatarSync(eventId, pairId);

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

  const presenterPreset = getPresetByKey(presenterPresetKey);
  const presenteePreset = getPresetByKey(presenteePresetKey);

  if (!presenterPreset || !presenteePreset) {
    return <div role="alert">アバターを読み込めませんでした</div>;
  }

  const presenterWeights = expressions[presenterUserId]?.weights ?? ZERO_WEIGHTS;
  const presenteeWeights = expressions[presenteeUserId]?.weights ?? ZERO_WEIGHTS;

  return (
    <div className="grid h-full w-full grid-cols-[1fr_2fr_1fr] gap-4">
      <section role="region" aria-label="紹介者アバター" className="relative h-full">
        <AvatarCanvas className="h-full w-full">
          <AvatarTile
            vrmUrl={presenterPreset.vrmUrl}
            weights={presenterWeights}
            reducedMotion={prefersReducedMotion}
          />
        </AvatarCanvas>
      </section>

      <section role="region" aria-label="スライド表示" className="flex items-center justify-center">
        {slideContent ?? (
          <div className="flex aspect-video w-full items-center justify-center rounded-lg bg-slate-200 text-gray-500">
            スライド準備中
          </div>
        )}
      </section>

      <section role="region" aria-label="被紹介者アバター" className="relative h-full">
        <AvatarCanvas className="h-full w-full">
          <AvatarTile
            vrmUrl={presenteePreset.vrmUrl}
            weights={presenteeWeights}
            reducedMotion={prefersReducedMotion}
          />
        </AvatarCanvas>
      </section>
    </div>
  );
}
