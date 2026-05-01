import { renderHook, act, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';

const mockCancelRaf = vi.fn();
let latestRafCb: ((ts: number) => void) | null = null;
const mockRaf = vi.fn().mockImplementation((cb: FrameRequestCallback) => {
  latestRafCb = cb;
  return 42;
});

vi.stubGlobal('requestAnimationFrame', mockRaf);
vi.stubGlobal('cancelAnimationFrame', mockCancelRaf);

import { useAvatarPerf } from '@/hooks/useAvatarPerf';

function fireFrame(ts: number) {
  const cb = latestRafCb;
  act(() => {
    cb?.(ts);
  });
}

function fireFrames(count: number, startTs: number, intervalMs: number) {
  for (let i = 0; i < count; i++) {
    fireFrame(startTs + i * intervalMs);
  }
}

describe('useAvatarPerf', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    latestRafCb = null;
    mockRaf.mockImplementation((cb: FrameRequestCallback) => {
      latestRafCb = cb;
      return 42;
    });
  });

  it('初期状態は fps=0, disableEffects=false, mediapipeTargetFps=30', () => {
    const { result } = renderHook(() => useAvatarPerf());
    expect(result.current.fps).toBe(0);
    expect(result.current.disableEffects).toBe(false);
    expect(result.current.mediapipeTargetFps).toBe(30);
  });

  it('1フレームだけでは fps=0 のまま (最低2フレーム必要)', () => {
    const { result } = renderHook(() => useAvatarPerf());
    fireFrame(0);
    expect(result.current.fps).toBe(0);
  });

  it('60fps 相当のフレームでは disableEffects=false, mediapipeTargetFps=30', async () => {
    const { result } = renderHook(() => useAvatarPerf());
    // 2フレームで fps ≈ 60 (16ms間隔)
    fireFrame(0);
    fireFrame(16);
    await waitFor(() => expect(result.current.fps).toBeGreaterThan(0));
    expect(result.current.disableEffects).toBe(false);
    expect(result.current.mediapipeTargetFps).toBe(30);
  });

  it('fps < 24 のとき disableEffects=true', async () => {
    const { result } = renderHook(() => useAvatarPerf());
    // 2フレーム 50ms 間隔 → fps ≈ 20 < 24
    fireFrame(0);
    fireFrame(50);
    await waitFor(() => expect(result.current.disableEffects).toBe(true));
  });

  it('fps が ENABLE 閾値 (30) 以上に回復すると disableEffects=false に戻る', async () => {
    const { result } = renderHook(() => useAvatarPerf());
    // まず低FPS
    fireFrame(0);
    fireFrame(50);
    await waitFor(() => expect(result.current.disableEffects).toBe(true));
    // 60fps に回復 (16ms間隔で60フレーム → 窓がリセット、currentFps >= 30)
    fireFrames(60, 100, 16);
    await waitFor(() => expect(result.current.disableEffects).toBe(false));
  });

  it('disableEffects は hysteresis 帯 [24, 30) で現状維持される', async () => {
    const { result } = renderHook(() => useAvatarPerf());
    // まず disableEffects=true に倒す (fps ≈ 20)
    fireFrame(0);
    fireFrame(50);
    await waitFor(() => expect(result.current.disableEffects).toBe(true));
    // hysteresis 帯 (≈26fps, 38ms 間隔) で現状維持されること
    // 38ms間隔で60フレーム発射 → 窓に挿入されたあとの fps ≈ 26 (>= 24, < 30)
    fireFrames(60, 100, 38);
    expect(result.current.disableEffects).toBe(true);
  });

  it('fps < 25 が 3s 継続すると mediapipeTargetFps=10', async () => {
    const { result } = renderHook(() => useAvatarPerf());
    // 50ms 間隔で 65 フレーム (3250ms) → fps ≈ 20 < 25 が 3s超継続
    fireFrames(65, 0, 50);
    await waitFor(() => expect(result.current.mediapipeTargetFps).toBe(10));
  });

  it('fps < 25 が 3s 未満なら mediapipeTargetFps=30 を維持', async () => {
    const { result } = renderHook(() => useAvatarPerf());
    // 50ms 間隔で 40 フレーム (2000ms) → 3s 未満
    fireFrames(40, 0, 50);
    // まだ degraded になっていないはず
    expect(result.current.mediapipeTargetFps).toBe(30);
  });

  it('degraded 後に fps が RECOVERY 閾値 (30) 以上に達すると mediapipeTargetFps=30 に戻る', async () => {
    const { result } = renderHook(() => useAvatarPerf());
    // まず degraded 状態にする
    fireFrames(65, 0, 50);
    await waitFor(() => expect(result.current.mediapipeTargetFps).toBe(10));
    // 60fps に回復 (16ms間隔で60フレーム → 窓が正常fps で埋まる)
    const recoveryStart = 65 * 50;
    fireFrames(60, recoveryStart, 16);
    await waitFor(() => expect(result.current.mediapipeTargetFps).toBe(30));
  });

  it('mediapipeTargetFps は hysteresis 帯 [25, 30) で現状維持される', async () => {
    const { result } = renderHook(() => useAvatarPerf());
    // 高 FPS (≈63) で初期 target=30 を確定 (lowFpsStart=null)
    fireFrames(60, 0, 16);
    await waitFor(() => expect(result.current.mediapipeTargetFps).toBe(30));
    // band 内 (≈26fps, 38ms 間隔) を 3s+ 維持しても degrade しないこと
    // (fps が DEGRADED 閾値 25 を下回らないので lowFpsStart は set されない)
    fireFrames(100, 1000, 38);
    expect(result.current.mediapipeTargetFps).toBe(30);
  });

  it('fps state は 1Hz でスロットリングされる (M1)', async () => {
    const { result } = renderHook(() => useAvatarPerf());
    // 初回計測で fps state が反映される
    fireFrame(0);
    fireFrame(16);
    await waitFor(() => expect(result.current.fps).toBeGreaterThan(0));
    const firstFps = result.current.fps;

    // 1秒未満で別の fps 値になる入力を与えても、fps state は更新されない
    // (lastFpsUpdate=16, 500-16=484<1000 → setFps はスキップ)
    fireFrame(500);
    // disableEffects は即時更新される (throttle 対象外)
    await waitFor(() => expect(result.current.disableEffects).toBe(true));
    // fps state はスロットリングにより firstFps のまま
    expect(result.current.fps).toBe(firstFps);
  });

  it('アンマウント時に cancelAnimationFrame が呼ばれる', async () => {
    const { unmount } = renderHook(() => useAvatarPerf());
    fireFrame(0);
    unmount();
    expect(mockCancelRaf).toHaveBeenCalledWith(42);
  });
});
