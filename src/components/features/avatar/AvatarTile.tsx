import { useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { useVRM } from '@/hooks/useVRM';
import type { ExpressionPayload } from '@/domain/avatar/value-objects/expression.payload';

interface AvatarTileProps {
  vrmUrl: string;
  weights: ExpressionPayload['weights'];
}

export function AvatarTile({ vrmUrl, weights }: AvatarTileProps) {
  const { vrm } = useVRM(vrmUrl);
  const prevWeightsRef = useRef<ExpressionPayload['weights'] | null>(null);

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
