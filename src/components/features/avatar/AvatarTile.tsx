import { useFrame } from '@react-three/fiber';
import { useVRM } from '@/hooks/useVRM';
import type { ExpressionPayload } from '@/domain/avatar/value-objects/expression.payload';

interface AvatarTileProps {
  vrmUrl: string;
  weights: ExpressionPayload['weights'];
  lookAt: ExpressionPayload['lookAt'] | null;
}

export function AvatarTile({ vrmUrl, weights }: AvatarTileProps) {
  const { vrm } = useVRM(vrmUrl);

  useFrame((state, delta) => {
    if (!vrm) return;

    if (vrm.expressionManager) {
      for (const [key, value] of Object.entries(weights)) {
        vrm.expressionManager.setValue(key, value);
      }
    }

    vrm.update(delta);
    state.invalidate();
  });

  if (!vrm) return null;

  return <primitive object={vrm.scene} />;
}
