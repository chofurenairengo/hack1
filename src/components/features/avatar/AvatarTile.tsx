import { useEffect, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import type { VRM } from '@pixiv/three-vrm';
import { useVRM } from '@/hooks/useVRM';
import type { ExpressionPayload } from '@/domain/avatar/value-objects/expression.payload';

interface AvatarTileProps {
  vrmUrl: string;
  weights: ExpressionPayload['weights'];
  onLoad?: (vrm: VRM) => void;
}

export function AvatarTile({ vrmUrl, weights, onLoad }: AvatarTileProps) {
  const { vrm } = useVRM(vrmUrl);
  const prevWeightsRef = useRef<ExpressionPayload['weights'] | null>(null);
  const onLoadRef = useRef(onLoad);

  useEffect(() => {
    onLoadRef.current = onLoad;
  });

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
