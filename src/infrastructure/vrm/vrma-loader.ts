import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { VRMAnimationLoaderPlugin } from '@pixiv/three-vrm-animation';
import type { VRMAnimation } from '@pixiv/three-vrm-animation';
import { ok, err } from '@/domain/shared/types/result';
import type { Result } from '@/domain/shared/types/result';

export type VRMALoadError = Readonly<{
  code: 'load_failed' | 'parse_failed';
  message: string;
  url: string;
}>;

class VRMALoader {
  private readonly cache = new Map<string, VRMAnimation>();
  private readonly inFlight = new Map<string, Promise<Result<VRMAnimation, VRMALoadError>>>();
  private readonly loader: GLTFLoader;

  constructor() {
    this.loader = new GLTFLoader();
    this.loader.register((parser) => new VRMAnimationLoaderPlugin(parser));
  }

  async load(url: string): Promise<Result<VRMAnimation, VRMALoadError>> {
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

  private async _fetch(url: string): Promise<Result<VRMAnimation, VRMALoadError>> {
    try {
      const gltf = await this.loader.loadAsync(url);
      const anim = gltf.userData.vrmAnimations?.[0] as VRMAnimation | undefined;
      if (!anim) {
        return err({ code: 'parse_failed', message: 'VRMAnimation not found in GLTF', url });
      }
      this.cache.set(url, anim);
      return ok(anim);
    } catch (e) {
      const message = e instanceof Error ? e.message : String(e);
      return err({ code: 'load_failed', message, url });
    }
  }
}

export const vrmaLoader = new VRMALoader();
