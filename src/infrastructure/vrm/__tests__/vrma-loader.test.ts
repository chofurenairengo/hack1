import { describe, it, expect, vi, beforeEach } from 'vitest';

const mockLoadAsync = vi.hoisted(() => vi.fn());

vi.mock('three/examples/jsm/loaders/GLTFLoader.js', () => ({
  GLTFLoader: vi.fn().mockImplementation(function (this: {
    register: ReturnType<typeof vi.fn>;
    loadAsync: ReturnType<typeof vi.fn>;
  }) {
    this.register = vi.fn();
    this.loadAsync = mockLoadAsync;
  }),
}));

vi.mock('@pixiv/three-vrm-animation', () => ({
  VRMAnimationLoaderPlugin: vi.fn(),
}));

import { vrmaLoader } from '../vrma-loader';

const fakeAnim = { name: 'fake-anim' };

beforeEach(() => {
  vi.clearAllMocks();
});

describe('vrmaLoader', () => {
  it('returns ok with the VRMAnimation on success', async () => {
    mockLoadAsync.mockResolvedValueOnce({ userData: { vrmAnimations: [fakeAnim] } });
    const result = await vrmaLoader.load('/test-success.vrma');
    expect(result.ok).toBe(true);
    if (result.ok) expect(result.value).toBe(fakeAnim);
  });

  it('caches and returns the same reference on second call', async () => {
    mockLoadAsync.mockResolvedValueOnce({ userData: { vrmAnimations: [fakeAnim] } });
    const r1 = await vrmaLoader.load('/cached-unique.vrma');
    const r2 = await vrmaLoader.load('/cached-unique.vrma');
    expect(mockLoadAsync).toHaveBeenCalledTimes(1);
    expect(r1.ok && r2.ok && r1.value === r2.value).toBe(true);
  });

  it('deduplicates concurrent in-flight requests (calls loadAsync only once)', async () => {
    let resolve!: (v: unknown) => void;
    mockLoadAsync.mockReturnValueOnce(
      new Promise((r) => {
        resolve = r;
      }),
    );
    const p1 = vrmaLoader.load('/inflight-unique.vrma');
    const p2 = vrmaLoader.load('/inflight-unique.vrma');
    resolve({ userData: { vrmAnimations: [fakeAnim] } });
    const [r1, r2] = await Promise.all([p1, p2]);
    expect(mockLoadAsync).toHaveBeenCalledTimes(1);
    expect(r1.ok && r2.ok && r1.value === r2.value).toBe(true);
  });

  it('returns err with code=parse_failed when vrmAnimations is missing', async () => {
    mockLoadAsync.mockResolvedValueOnce({ userData: {} });
    const result = await vrmaLoader.load('/no-anim-unique.vrma');
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.code).toBe('parse_failed');
      expect(result.error.url).toBe('/no-anim-unique.vrma');
    }
  });

  it('returns err with code=load_failed when loadAsync throws', async () => {
    mockLoadAsync.mockRejectedValueOnce(new Error('network error'));
    const result = await vrmaLoader.load('/fail-unique.vrma');
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.code).toBe('load_failed');
      expect(result.error.message).toBe('network error');
    }
  });
});
