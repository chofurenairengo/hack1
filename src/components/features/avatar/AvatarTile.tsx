import { useEffect, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import type { VRM } from '@pixiv/three-vrm';
import { useVRM } from '@/hooks/useVRM';
import { useVRMAnimationPlayer } from '@/hooks/useVRMAnimationPlayer';
import type { ExpressionPayload } from '@/domain/avatar/value-objects/expression.payload';

interface AvatarTileProps {
  vrmUrl: string;
  weights: ExpressionPayload['weights'];
  reducedMotion?: boolean;
  onLoad?: (vrm: VRM) => void;
  onError?: (msg: string) => void;
}

export function AvatarTile({ vrmUrl, weights, reducedMotion, onLoad, onError }: AvatarTileProps) {
  const { vrm, error } = useVRM(vrmUrl);
  const prevWeightsRef = useRef<ExpressionPayload['weights'] | null>(null);
  const onLoadRef = useRef(onLoad);
  const onErrorRef = useRef(onError);

  useVRMAnimationPlayer({
    vrm: vrm ?? null,
    talkingWeight: weights.aa,
    reducedMotion: reducedMotion ?? false,
  });

  useEffect(() => {
    onLoadRef.current = onLoad;
    onErrorRef.current = onError;
  });

  useEffect(() => {
    if (error) onErrorRef.current?.(error);
  }, [error]);

  useEffect(() => {
    prevWeightsRef.current = null;
    if (vrm) onLoadRef.current?.(vrm);
  }, [vrm]);

  useFrame((state, delta) => {
    if (!vrm) return;

    vrm.update(delta);

    if (prevWeightsRef.current !== weights) {
      prevWeightsRef.current = weights;
      if (vrm.expressionManager) {
        for (const [key, value] of Object.entries(weights)) {
          vrm.expressionManager.setValue(key, value);
        }
      }
      state.invalidate();
    }
  });

  if (!vrm) return null;

  return <primitive object={vrm.scene} />;
}
