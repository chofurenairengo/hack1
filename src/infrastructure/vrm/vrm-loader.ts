import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { VRMLoaderPlugin } from '@pixiv/three-vrm';
import type { VRM } from '@pixiv/three-vrm';
import type { Object3D, Mesh, Material } from 'three';
import { ok, err } from '@/domain/shared/types/result';
import type { Result } from '@/domain/shared/types/result';

export type AvatarLoadError = Readonly<{
  code: 'load_failed' | 'parse_failed';
  message: string;
  url: string;
}>;

function disposeVrm(vrm: VRM): void {
  vrm.scene.traverse((obj: Object3D) => {
    const mesh = obj as Mesh;
    if (!mesh.isMesh) return;
    mesh.geometry.dispose();
    const mats: Material[] = Array.isArray(mesh.material) ? mesh.material : [mesh.material];
    mats.forEach((m) => m.dispose());
  });
}

class VRMLoader {
  private readonly cache = new Map<string, VRM>();
  private readonly inFlight = new Map<string, Promise<Result<VRM, AvatarLoadError>>>();
  private readonly loader: GLTFLoader;

  constructor() {
    this.loader = new GLTFLoader();
    this.loader.register((parser) => new VRMLoaderPlugin(parser));
  }

  async load(url: string): Promise<Result<VRM, AvatarLoadError>> {
    const cached = this.cache.get(url);
    if (cached) return ok(cached);

    const inflight = this.inFlight.get(url);
    if (inflight) return inflight;

    const promise = this._fetch(url);
    this.inFlight.set(url, promise);
    try {
      return await promise;
    } finally {
      this.inFlight.delete(url);
    }
  }

  private async _fetch(url: string): Promise<Result<VRM, AvatarLoadError>> {
    try {
      const gltf = await this.loader.loadAsync(url);
      const vrm = gltf.userData.vrm as VRM | undefined;
      if (!vrm) {
        return err({ code: 'parse_failed', message: 'VRM not found in GLTF', url });
      }
      this.cache.set(url, vrm);
      return ok(vrm);
    } catch (e) {
      const message = e instanceof Error ? e.message : String(e);
      return err({ code: 'load_failed', message, url });
    }
  }

  dispose(url: string): void {
    const vrm = this.cache.get(url);
    if (vrm) disposeVrm(vrm);
    this.cache.delete(url);
  }

  disposeAll(): void {
    this.cache.forEach(disposeVrm);
    this.cache.clear();
  }
}

export const vrmLoader = new VRMLoader();
export const loadVrm = (url: string): Promise<Result<VRM, AvatarLoadError>> => vrmLoader.load(url);
