import { renderHook, waitFor, act } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';

const { mockGetRms, mockClose, mockCreateLipSyncAnalyzer } = vi.hoisted(() => ({
  mockGetRms: vi.fn<() => number>().mockReturnValue(0),
  mockClose: vi.fn(),
  mockCreateLipSyncAnalyzer: vi.fn(),
}));

vi.mock('@/infrastructure/mediapipe/lip-sync-analyzer', () => ({
  createLipSyncAnalyzer: mockCreateLipSyncAnalyzer,
}));

const mockRafId = 42;
const mockRaf = vi.fn();
const mockCancelRaf = vi.fn();
vi.stubGlobal('requestAnimationFrame', mockRaf);
vi.stubGlobal('cancelAnimationFrame', mockCancelRaf);

import { useLipSync } from '@/hooks/useLipSync';

function makeStream(): MediaStream {
  return {} as MediaStream;
}

function makeAnalyzer() {
  return { getRms: mockGetRms, close: mockClose };
}

describe('useLipSync', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockCreateLipSyncAnalyzer.mockReturnValue(makeAnalyzer());
    mockGetRms.mockReturnValue(0);

    let rafBusy = false;
    mockRaf.mockImplementation((cb: FrameRequestCallback) => {
      if (!rafBusy) {
        rafBusy = true;
        cb(performance.now());
        rafBusy = false;
      }
      return mockRafId;
    });
  });

  it('audioStream=null → rms は 0 のまま、analyzer は作られない', () => {
    const { result } = renderHook(() => useLipSync(null));
    expect(result.current.rms).toBe(0);
    expect(mockCreateLipSyncAnalyzer).not.toHaveBeenCalled();
  });

  it('stream あり → createLipSyncAnalyzer が呼ばれ rms が更新される', async () => {
    mockGetRms.mockReturnValue(0.6);
    const stream = makeStream();
    const { result } = renderHook(() => useLipSync(stream));
    await waitFor(() => expect(result.current.rms).toBeCloseTo(0.6));
    expect(mockCreateLipSyncAnalyzer).toHaveBeenCalledWith(stream);
  });

  it('アンマウント → cancelAnimationFrame と analyzer.close() が呼ばれる', async () => {
    const stream = makeStream();
    const { unmount } = renderHook(() => useLipSync(stream));
    await waitFor(() => expect(mockCreateLipSyncAnalyzer).toHaveBeenCalledOnce());
    unmount();
    expect(mockCancelRaf).toHaveBeenCalled();
    expect(mockClose).toHaveBeenCalledOnce();
  });

  it('stream が null → stream に変わると analyzer が作られる', async () => {
    mockGetRms.mockReturnValue(0.4);
    const stream = makeStream();
    const { result, rerender } = renderHook(({ s }: { s: MediaStream | null }) => useLipSync(s), {
      initialProps: { s: null as MediaStream | null },
    });
    expect(result.current.rms).toBe(0);

    rerender({ s: stream });
    await waitFor(() => expect(result.current.rms).toBeCloseTo(0.4));
    expect(mockCreateLipSyncAnalyzer).toHaveBeenCalledOnce();
  });

  it('stream が変わる → 旧 analyzer が close され新 analyzer が作られる', async () => {
    const streamA = makeStream();
    const streamB = {} as MediaStream;
    const analyzerA = { getRms: vi.fn().mockReturnValue(0.2), close: vi.fn() };
    const analyzerB = { getRms: vi.fn().mockReturnValue(0.8), close: vi.fn() };
    mockCreateLipSyncAnalyzer.mockReturnValueOnce(analyzerA).mockReturnValueOnce(analyzerB);

    const { rerender } = renderHook(({ s }: { s: MediaStream }) => useLipSync(s), {
      initialProps: { s: streamA },
    });
    await waitFor(() => expect(mockCreateLipSyncAnalyzer).toHaveBeenCalledOnce());

    act(() => {
      rerender({ s: streamB });
    });
    await waitFor(() => expect(mockCreateLipSyncAnalyzer).toHaveBeenCalledTimes(2));
    expect(analyzerA.close).toHaveBeenCalledOnce();
  });
});
