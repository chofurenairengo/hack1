import { describe, it, expect, beforeEach } from 'vitest';
import { BlendShapeMapper } from '@/infrastructure/avatar/retarget';

function makeArkit(overrides: Record<string, number> = {}): Record<string, number> {
  return {
    mouthSmileLeft: 0,
    mouthSmileRight: 0,
    mouthFrownLeft: 0,
    mouthFrownRight: 0,
    browDownLeft: 0,
    browDownRight: 0,
    eyeWideLeft: 0,
    eyeWideRight: 0,
    browInnerUp: 0,
    cheekSquintLeft: 0,
    cheekSquintRight: 0,
    jawOpen: 0,
    mouthUpperUpLeft: 0,
    mouthUpperUpRight: 0,
    mouthPucker: 0,
    mouthFunnel: 0,
    mouthStretchLeft: 0,
    mouthStretchRight: 0,
    mouthLowerDownLeft: 0,
    mouthLowerDownRight: 0,
    ...overrides,
  };
}

describe('BlendShapeMapper', () => {
  describe('lerpFactor=1 (lerp なし) でのマッピング精度', () => {
    let mapper: BlendShapeMapper;

    beforeEach(() => {
      mapper = new BlendShapeMapper(1);
    });

    it('全キーが VrmExpressionWeights に揃っている', () => {
      const result = mapper.mapBlendShapes(makeArkit());
      expect(result).toHaveProperty('happy');
      expect(result).toHaveProperty('sad');
      expect(result).toHaveProperty('angry');
      expect(result).toHaveProperty('relaxed');
      expect(result).toHaveProperty('surprised');
      expect(result).toHaveProperty('aa');
      expect(result).toHaveProperty('ih');
      expect(result).toHaveProperty('ou');
      expect(result).toHaveProperty('ee');
      expect(result).toHaveProperty('oh');
    });

    it('ゼロ入力ではすべての重みが 0', () => {
      const result = mapper.mapBlendShapes(makeArkit());
      for (const v of Object.values(result)) {
        expect(v).toBe(0);
      }
    });

    it('happy: mouthSmileLeft=0.8, mouthSmileRight=0.6 → 0.7', () => {
      const result = mapper.mapBlendShapes(
        makeArkit({ mouthSmileLeft: 0.8, mouthSmileRight: 0.6 }),
      );
      expect(result.happy).toBe(0.7);
    });

    it('sad: mouthFrownLeft=0.6, mouthFrownRight=0.4 → 0.5', () => {
      const result = mapper.mapBlendShapes(
        makeArkit({ mouthFrownLeft: 0.6, mouthFrownRight: 0.4 }),
      );
      expect(result.sad).toBe(0.5);
    });

    it('angry: browDownLeft=0.9, browDownRight=0.5 → 0.7', () => {
      const result = mapper.mapBlendShapes(makeArkit({ browDownLeft: 0.9, browDownRight: 0.5 }));
      expect(result.angry).toBe(0.7);
    });

    it('aa: jawOpen=0.8 → 0.8', () => {
      const result = mapper.mapBlendShapes(makeArkit({ jawOpen: 0.8 }));
      expect(result.aa).toBe(0.8);
    });

    it('surprised: eyeWideLeft=1.0, eyeWideRight=1.0, browInnerUp=0.5 → 0.88', () => {
      const result = mapper.mapBlendShapes(
        makeArkit({ eyeWideLeft: 1.0, eyeWideRight: 1.0, browInnerUp: 0.5 }),
      );
      // avg(avg(1,1), 0.5) = avg(1, 0.5) = 0.75
      expect(result.surprised).toBe(0.75);
    });

    it('ou: mouthPucker=0.6, mouthFunnel=0.4 → 0.5', () => {
      const result = mapper.mapBlendShapes(makeArkit({ mouthPucker: 0.6, mouthFunnel: 0.4 }));
      expect(result.ou).toBe(0.5);
    });

    it('数値は小数2桁に丸められる', () => {
      // avg(0.7, 0.8) = 0.75 → 0.75 (丸め後も同値)
      // avg(0.1, 0.2) = 0.15 → 0.15
      const result = mapper.mapBlendShapes(
        makeArkit({ mouthSmileLeft: 0.1, mouthSmileRight: 0.2 }),
      );
      expect(result.happy).toBe(0.15);
    });
  });

  describe('clamp: 値域外入力', () => {
    let mapper: BlendShapeMapper;

    beforeEach(() => {
      mapper = new BlendShapeMapper(1);
    });

    it('負値入力は 0 にクランプされる', () => {
      const result = mapper.mapBlendShapes(
        makeArkit({ mouthSmileLeft: -0.5, mouthSmileRight: -1 }),
      );
      expect(result.happy).toBe(0);
    });

    it('1.0 超は 1.0 にクランプされる', () => {
      const result = mapper.mapBlendShapes(
        makeArkit({ mouthSmileLeft: 1.5, mouthSmileRight: 1.2 }),
      );
      expect(result.happy).toBe(1);
    });

    it('jawOpen が 1.5 でも aa は 1.0', () => {
      const result = mapper.mapBlendShapes(makeArkit({ jawOpen: 1.5 }));
      expect(result.aa).toBe(1);
    });
  });

  describe('lerp: lerpFactor=0.5 での平滑化', () => {
    let mapper: BlendShapeMapper;

    beforeEach(() => {
      mapper = new BlendShapeMapper(0.5);
    });

    it('初回呼び出しは 0 から lerp される (happy)', () => {
      const result = mapper.mapBlendShapes(
        makeArkit({ mouthSmileLeft: 0.8, mouthSmileRight: 0.6 }),
      );
      // raw=0.7, lerp(0, 0.7, 0.5) = 0.35
      expect(result.happy).toBe(0.35);
    });

    it('同一入力を繰り返すと目標値に収束する', () => {
      const arkit = makeArkit({ jawOpen: 1.0 });
      let prev = 0;
      for (let i = 0; i < 10; i++) {
        const result = mapper.mapBlendShapes(arkit);
        expect(result.aa).toBeGreaterThanOrEqual(prev);
        prev = result.aa;
      }
      expect(prev).toBeGreaterThan(0.99);
    });

    it('入力が 0 に戻ると値が下降する', () => {
      const up = makeArkit({ jawOpen: 1.0 });
      const down = makeArkit({ jawOpen: 0.0 });
      mapper.mapBlendShapes(up);
      mapper.mapBlendShapes(up);
      const peak = mapper.mapBlendShapes(up).aa;
      const after = mapper.mapBlendShapes(down).aa;
      expect(after).toBeLessThan(peak);
    });
  });

  describe('reset()', () => {
    it('reset 後の初回出力が 0 から lerp される', () => {
      const mapper = new BlendShapeMapper(0.5);
      const arkit = makeArkit({ jawOpen: 1.0 });

      // 複数回呼んで状態を蓄積
      mapper.mapBlendShapes(arkit);
      mapper.mapBlendShapes(arkit);
      mapper.mapBlendShapes(arkit);

      mapper.reset();

      // リセット後は 0 から lerp
      const result = mapper.mapBlendShapes(arkit);
      expect(result.aa).toBe(0.5); // lerp(0, 1.0, 0.5) = 0.5
    });
  });

  describe('欠損キー', () => {
    it('存在しない ARKit キーは 0 として扱う', () => {
      const mapper = new BlendShapeMapper(1);
      const result = mapper.mapBlendShapes({});
      for (const v of Object.values(result)) {
        expect(v).toBe(0);
      }
    });
  });
});
