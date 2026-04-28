import { beforeEach, describe, expect, it, vi } from 'vitest';

const { mockLoadAsync, mockRegister } = vi.hoisted(() => ({
  mockLoadAsync: vi.fn(),
  mockRegister: vi.fn(),
}));

vi.mock('three/examples/jsm/loaders/GLTFLoader.js', () => ({
  GLTFLoader: vi.fn().mockImplementation(function () {
    return { register: mockRegister, loadAsync: mockLoadAsync };
  }),
}));

vi.mock('@pixiv/three-vrm', () => ({
  VRMLoaderPlugin: vi.fn().mockImplementation(() => ({})),
}));

import type { VRM } from '@pixiv/three-vrm';
import { loadVrm, vrmLoader } from '@/infrastructure/vrm/vrm-loader';

const mockVrm = { scene: {} } as unknown as VRM;

describe('VRMLoader', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vrmLoader.disposeAll();
  });

  describe('load', () => {
    it('ロード成功時に ok: true と VRM インスタンスを返す', async () => {
      mockLoadAsync.mockResolvedValueOnce({ userData: { vrm: mockVrm } });

      const result = await loadVrm('/vrm/test.vrm');

      expect(result.ok).toBe(true);
      if (result.ok) expect(result.value).toBe(mockVrm);
    });

    it('同じ URL を 2 回 load しても GLTFLoader.loadAsync は 1 回のみ呼ばれる', async () => {
      mockLoadAsync.mockResolvedValueOnce({ userData: { vrm: mockVrm } });

      const url = '/vrm/test.vrm';
      await loadVrm(url);
      await loadVrm(url);

      expect(mockLoadAsync).toHaveBeenCalledTimes(1);
    });

    it('2 回目の load はキャッシュ済み VRM を返す', async () => {
      mockLoadAsync.mockResolvedValueOnce({ userData: { vrm: mockVrm } });

      const url = '/vrm/test.vrm';
      const first = await loadVrm(url);
      const second = await loadVrm(url);

      expect(first.ok && second.ok && first.value === second.value).toBe(true);
    });

    it('userData.vrm が存在しない場合に parse_failed を返す', async () => {
      mockLoadAsync.mockResolvedValueOnce({ userData: {} });

      const result = await loadVrm('/vrm/broken.vrm');

      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.error.code).toBe('parse_failed');
        expect(result.error.url).toBe('/vrm/broken.vrm');
      }
    });

    it('ロード失敗時に load_failed を返し throw しない', async () => {
      mockLoadAsync.mockRejectedValueOnce(new Error('Network error'));

      const result = await loadVrm('/vrm/missing.vrm');

      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.error.code).toBe('load_failed');
        expect(result.error.message).toBe('Network error');
        expect(result.error.url).toBe('/vrm/missing.vrm');
      }
    });
  });

  describe('dispose', () => {
    it('dispose(url) 後に再ロードすると loadAsync が再度呼ばれる', async () => {
      mockLoadAsync.mockResolvedValue({ userData: { vrm: mockVrm } });

      const url = '/vrm/test.vrm';
      await loadVrm(url);
      vrmLoader.dispose(url);
      await loadVrm(url);

      expect(mockLoadAsync).toHaveBeenCalledTimes(2);
    });

    it('disposeAll() 後はすべての URL が再ロードされる', async () => {
      mockLoadAsync.mockResolvedValue({ userData: { vrm: mockVrm } });

      await loadVrm('/vrm/a.vrm');
      await loadVrm('/vrm/b.vrm');
      vrmLoader.disposeAll();
      await loadVrm('/vrm/a.vrm');
      await loadVrm('/vrm/b.vrm');

      expect(mockLoadAsync).toHaveBeenCalledTimes(4);
    });
  });
});
