import { describe, it, expect, vi } from 'vitest';

vi.mock('@/hooks/useAvatarSync', () => ({
  useAvatarSync: vi.fn(),
}));
vi.mock('@react-three/fiber', () => ({
  useFrame: vi.fn(),
  useThree: vi.fn(),
}));

import { computeCircularLayout, resolvePreset, computeFpsCamera } from '../RoundtableScene';

const TABLE_RADIUS = 1.5;
const EYE_HEIGHT = 1.5;
const TABLE_CENTER_Y = 1.0;

describe('computeCircularLayout', () => {
  it('returns 3 points for count=3', () => {
    const layout = computeCircularLayout(3, TABLE_RADIUS);
    expect(layout).toHaveLength(3);
  });

  it('returns 4 points for count=4', () => {
    const layout = computeCircularLayout(4, TABLE_RADIUS);
    expect(layout).toHaveLength(4);
  });

  it('places index=0 at (0, 0, radius) for any count', () => {
    const layout = computeCircularLayout(4, TABLE_RADIUS);
    expect(layout[0]!.x).toBeCloseTo(0);
    expect(layout[0]!.z).toBeCloseTo(TABLE_RADIUS);
  });

  it('places all points on the circle of given radius', () => {
    for (const count of [3, 4] as const) {
      const layout = computeCircularLayout(count, TABLE_RADIUS);
      for (const point of layout) {
        const dist = Math.sqrt(point.x ** 2 + point.z ** 2);
        expect(dist).toBeCloseTo(TABLE_RADIUS);
      }
    }
  });

  it('sets rotY = theta so each avatar faces the center', () => {
    const count = 4;
    const layout = computeCircularLayout(count, TABLE_RADIUS);
    layout.forEach((point, i) => {
      const theta = (2 * Math.PI * i) / count;
      expect(point.rotY).toBeCloseTo(theta);
    });
  });

  it('places all 4 points at correct coordinates for count=4', () => {
    const layout = computeCircularLayout(4, TABLE_RADIUS);
    expect(layout[0]!.x).toBeCloseTo(0);
    expect(layout[0]!.z).toBeCloseTo(TABLE_RADIUS);
    expect(layout[1]!.x).toBeCloseTo(TABLE_RADIUS);
    expect(layout[1]!.z).toBeCloseTo(0);
    expect(layout[2]!.x).toBeCloseTo(0);
    expect(layout[2]!.z).toBeCloseTo(-TABLE_RADIUS);
    expect(layout[3]!.x).toBeCloseTo(-TABLE_RADIUS);
    expect(layout[3]!.z).toBeCloseTo(0);
  });
});

describe('resolvePreset', () => {
  it('returns the matching preset for a valid key', () => {
    const preset = resolvePreset('sample_a_woman');
    expect(preset.key).toBe('sample_a_woman');
  });

  it('falls back to sample_c_man for an invalid key', () => {
    const preset = resolvePreset('does_not_exist');
    expect(preset.key).toBe('sample_c_man');
  });

  it('falls back to sample_c_man for an empty string', () => {
    const preset = resolvePreset('');
    expect(preset.key).toBe('sample_c_man');
  });

  it('returns a preset with a non-empty vrmUrl', () => {
    const preset = resolvePreset('sample_b_woman');
    expect(preset.vrmUrl).toBeTruthy();
  });
});

describe('computeFpsCamera', () => {
  it('places camera at selfIndex=0 position (0, EYE_HEIGHT, radius)', () => {
    const cam = computeFpsCamera(0, 4, TABLE_RADIUS);
    expect(cam.position[0]).toBeCloseTo(0);
    expect(cam.position[1]).toBeCloseTo(EYE_HEIGHT);
    expect(cam.position[2]).toBeCloseTo(TABLE_RADIUS);
  });

  it('targets the table center (0, TABLE_CENTER_Y, 0)', () => {
    const cam = computeFpsCamera(0, 4, TABLE_RADIUS);
    expect(cam.target[0]).toBeCloseTo(0);
    expect(cam.target[1]).toBeCloseTo(TABLE_CENTER_Y);
    expect(cam.target[2]).toBeCloseTo(0);
  });

  it('places camera at selfIndex=2 on opposite side for count=4', () => {
    const cam = computeFpsCamera(2, 4, TABLE_RADIUS);
    expect(cam.position[0]).toBeCloseTo(0);
    expect(cam.position[1]).toBeCloseTo(EYE_HEIGHT);
    expect(cam.position[2]).toBeCloseTo(-TABLE_RADIUS);
  });

  it('places camera at correct position for selfIndex=1, count=4', () => {
    const cam = computeFpsCamera(1, 4, TABLE_RADIUS);
    expect(cam.position[0]).toBeCloseTo(TABLE_RADIUS);
    expect(cam.position[1]).toBeCloseTo(EYE_HEIGHT);
    expect(cam.position[2]).toBeCloseTo(0);
  });

  it('camera is always at EYE_HEIGHT regardless of selfIndex', () => {
    for (let i = 0; i < 4; i++) {
      const cam = computeFpsCamera(i, 4, TABLE_RADIUS);
      expect(cam.position[1]).toBeCloseTo(EYE_HEIGHT);
    }
  });

  it('camera position is always on the circle of given radius', () => {
    for (let i = 0; i < 3; i++) {
      const cam = computeFpsCamera(i, 3, TABLE_RADIUS);
      const dist = Math.sqrt(cam.position[0] ** 2 + cam.position[2] ** 2);
      expect(dist).toBeCloseTo(TABLE_RADIUS);
    }
  });
});
