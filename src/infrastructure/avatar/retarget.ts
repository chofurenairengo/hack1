import type { ExpressionPayload } from '@/domain/avatar/value-objects/expression.payload';

/** ARKit52 blendshape score map (categoryName → raw score, may exceed [0,1]) */
export type BlendShapeMap = Readonly<Record<string, number>>;

/** VRM expression weights — same shape as ExpressionPayload['weights'] */
export type VrmExpressionWeights = ExpressionPayload['weights'];

const DEFAULT_LERP_FACTOR = 0.5;

const ZERO_WEIGHTS: VrmExpressionWeights = {
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

function get(map: BlendShapeMap, key: string): number {
  return map[key] ?? 0;
}

function avg(a: number, b: number): number {
  return (a + b) / 2;
}

function clamp01(v: number): number {
  return Math.max(0, Math.min(1, v));
}

function round2(v: number): number {
  return Math.round(v * 100) / 100;
}

function lerp(current: number, target: number, factor: number): number {
  return current + (target - current) * factor;
}

function computeRaw(s: BlendShapeMap): VrmExpressionWeights {
  const g = (k: string) => get(s, k);
  return {
    happy: clamp01(avg(g('mouthSmileLeft'), g('mouthSmileRight'))),
    sad: clamp01(avg(g('mouthFrownLeft'), g('mouthFrownRight'))),
    angry: clamp01(avg(g('browDownLeft'), g('browDownRight'))),
    surprised: clamp01(avg(avg(g('eyeWideLeft'), g('eyeWideRight')), g('browInnerUp'))),
    relaxed: clamp01(avg(g('cheekSquintLeft'), g('cheekSquintRight'))),
    aa: clamp01(g('jawOpen')),
    ih: clamp01(avg(g('mouthUpperUpLeft'), g('mouthUpperUpRight'))),
    ou: clamp01(avg(g('mouthPucker'), g('mouthFunnel'))),
    ee: clamp01(avg(g('mouthStretchLeft'), g('mouthStretchRight'))),
    oh: clamp01(avg(g('mouthLowerDownLeft'), g('mouthLowerDownRight'))),
  };
}

/**
 * Maps ARKit52 blendshape scores to VRM Expression weights.
 *
 * Applies temporal lerp smoothing (to reduce per-frame jitter) and
 * rounds output to 2 decimal places per the useAvatarSync payload spec.
 */
export class BlendShapeMapper {
  private prev: VrmExpressionWeights = { ...ZERO_WEIGHTS };
  private readonly lerpFactor: number;

  constructor(lerpFactor = DEFAULT_LERP_FACTOR) {
    this.lerpFactor = Math.max(0, Math.min(1, lerpFactor));
  }

  mapBlendShapes(arkit52: BlendShapeMap): VrmExpressionWeights {
    const raw = computeRaw(arkit52);
    const f = this.lerpFactor;
    const smoothed: VrmExpressionWeights = {
      happy: round2(lerp(this.prev.happy, raw.happy, f)),
      sad: round2(lerp(this.prev.sad, raw.sad, f)),
      angry: round2(lerp(this.prev.angry, raw.angry, f)),
      relaxed: round2(lerp(this.prev.relaxed, raw.relaxed, f)),
      surprised: round2(lerp(this.prev.surprised, raw.surprised, f)),
      aa: round2(lerp(this.prev.aa, raw.aa, f)),
      ih: round2(lerp(this.prev.ih, raw.ih, f)),
      ou: round2(lerp(this.prev.ou, raw.ou, f)),
      ee: round2(lerp(this.prev.ee, raw.ee, f)),
      oh: round2(lerp(this.prev.oh, raw.oh, f)),
    };
    this.prev = smoothed;
    return smoothed;
  }

  reset(): void {
    this.prev = { ...ZERO_WEIGHTS };
  }
}
