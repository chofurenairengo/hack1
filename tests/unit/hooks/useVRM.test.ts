import { renderHook, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';

const mockLoadVrm = vi.hoisted(() => vi.fn());
const mockDispose = vi.hoisted(() => vi.fn());
const mockVrmLoader = vi.hoisted(() => ({ dispose: mockDispose }));

vi.mock('@/infrastructure/vrm/vrm-loader', () => ({
  loadVrm: mockLoadVrm,
  vrmLoader: mockVrmLoader,
}));

import { useVRM } from '@/hooks/useVRM';
import type { VRM } from '@pixiv/three-vrm';

const fakeVrm = { scene: {}, update: vi.fn() } as unknown as VRM;
const fakeError = { code: 'load_failed' as const, message: 'Network error', url: '/vrm/test.vrm' };

describe('useVRM', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns null state immediately when url is null', () => {
    const { result } = renderHook(() => useVRM(null));
    expect(result.current).toEqual({ vrm: null, error: null, loading: false });
    expect(mockLoadVrm).not.toHaveBeenCalled();
  });

  it('starts with loading=true when url is provided', () => {
    mockLoadVrm.mockReturnValue(new Promise(() => {}));
    const { result } = renderHook(() => useVRM('/vrm/test.vrm'));
    expect(result.current.loading).toBe(true);
    expect(result.current.vrm).toBeNull();
    expect(result.current.error).toBeNull();
  });

  it('sets vrm on successful load', async () => {
    mockLoadVrm.mockResolvedValue({ ok: true, value: fakeVrm });
    const { result } = renderHook(() => useVRM('/vrm/test.vrm'));
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.vrm).toBe(fakeVrm);
    expect(result.current.error).toBeNull();
  });

  it('sets error on failed load', async () => {
    mockLoadVrm.mockResolvedValue({ ok: false, error: fakeError });
    const { result } = renderHook(() => useVRM('/vrm/test.vrm'));
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.vrm).toBeNull();
    expect(result.current.error).toBe(fakeError.message);
  });

  it('calls dispose on unmount', async () => {
    mockLoadVrm.mockResolvedValue({ ok: true, value: fakeVrm });
    const { unmount, result } = renderHook(() => useVRM('/vrm/test.vrm'));
    await waitFor(() => expect(result.current.loading).toBe(false));
    unmount();
    expect(mockDispose).toHaveBeenCalledWith('/vrm/test.vrm');
  });

  it('does not call dispose when url is null and unmounted', () => {
    const { unmount } = renderHook(() => useVRM(null));
    unmount();
    expect(mockDispose).not.toHaveBeenCalled();
  });

  it('disposes old url when url changes', async () => {
    mockLoadVrm.mockResolvedValue({ ok: true, value: fakeVrm });
    const { rerender, result } = renderHook(({ url }: { url: string | null }) => useVRM(url), {
      initialProps: { url: '/vrm/first.vrm' },
    });
    await waitFor(() => expect(result.current.loading).toBe(false));
    rerender({ url: '/vrm/second.vrm' });
    expect(mockDispose).toHaveBeenCalledWith('/vrm/first.vrm');
  });

  it('ignores stale result when url changes before previous load completes', async () => {
    const staleVrm = { scene: {}, update: vi.fn() } as unknown as VRM;
    let resolveStale!: (v: unknown) => void;
    const stalePromise = new Promise((res) => {
      resolveStale = res;
    });

    mockLoadVrm
      .mockReturnValueOnce(stalePromise)
      .mockResolvedValueOnce({ ok: true, value: fakeVrm });

    const { result, rerender } = renderHook(({ url }: { url: string | null }) => useVRM(url), {
      initialProps: { url: '/vrm/first.vrm' },
    });

    rerender({ url: '/vrm/second.vrm' });
    await waitFor(() => expect(result.current.loading).toBe(false));

    resolveStale({ ok: true, value: staleVrm });
    await waitFor(() => expect(result.current.vrm).toBe(fakeVrm));
  });
});
