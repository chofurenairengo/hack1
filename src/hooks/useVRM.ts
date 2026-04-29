import { useEffect, useState } from 'react';
import type { VRM } from '@pixiv/three-vrm';
import { loadVrm, vrmLoader } from '@/infrastructure/vrm/vrm-loader';

interface UseVRMResult {
  vrm: VRM | null;
  error: string | null;
  loading: boolean;
}

type LoadResult = { url: string; vrm: VRM | null; error: string | null };

export function useVRM(url: string | null): UseVRMResult {
  const [result, setResult] = useState<LoadResult | null>(null);

  useEffect(() => {
    if (url === null) return;

    let active = true;

    loadVrm(url).then((r) => {
      if (!active) return;
      if (r.ok) {
        setResult({ url, vrm: r.value, error: null });
      } else {
        setResult({ url, vrm: null, error: r.error.message });
      }
    });

    return () => {
      active = false;
      vrmLoader.dispose(url);
    };
  }, [url]);

  if (url === null) return { vrm: null, error: null, loading: false };
  if (result?.url !== url) return { vrm: null, error: null, loading: true };
  return { vrm: result.vrm, error: result.error, loading: false };
}
