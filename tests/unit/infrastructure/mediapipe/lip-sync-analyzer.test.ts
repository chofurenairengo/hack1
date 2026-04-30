import { describe, it, expect, vi, beforeEach } from 'vitest';

const { mockGetByteTimeDomainData, mockDisconnect, mockClose, mockConnect } = vi.hoisted(() => ({
  mockGetByteTimeDomainData: vi.fn(),
  mockDisconnect: vi.fn(),
  mockClose: vi.fn().mockResolvedValue(undefined),
  mockConnect: vi.fn(),
}));

const mockAnalyser = {
  fftSize: 0,
  getByteTimeDomainData: mockGetByteTimeDomainData,
};

const mockSource = {
  connect: mockConnect,
  disconnect: mockDisconnect,
};

const mockCtx = {
  createAnalyser: vi.fn().mockReturnValue(mockAnalyser),
  createMediaStreamSource: vi.fn().mockReturnValue(mockSource),
  close: mockClose,
};

vi.stubGlobal(
  'AudioContext',
  vi.fn().mockImplementation(function () {
    return mockCtx;
  }),
);

import { createLipSyncAnalyzer } from '@/infrastructure/mediapipe/lip-sync-analyzer';

function makeStream(): MediaStream {
  return {} as MediaStream;
}

function fillBuffer(analyser: typeof mockAnalyser, values: number[]) {
  mockGetByteTimeDomainData.mockImplementation((buf: Uint8Array) => {
    for (let i = 0; i < buf.length; i++) {
      buf[i] = values[i % values.length]!;
    }
  });
  // Reflect the fftSize set by createLipSyncAnalyzer (256)
  analyser.fftSize = 256;
}

describe('createLipSyncAnalyzer', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockCtx.createAnalyser.mockReturnValue(mockAnalyser);
    mockCtx.createMediaStreamSource.mockReturnValue(mockSource);
    mockClose.mockResolvedValue(undefined);
    mockAnalyser.fftSize = 0;
  });

  it('無音 (全サンプル 128) → getRms() は 0', () => {
    fillBuffer(mockAnalyser, [128]);
    const handle = createLipSyncAnalyzer(makeStream());
    expect(handle.getRms()).toBe(0);
  });

  it('最大振幅 (交互 0/255) → getRms() は約 1.0', () => {
    fillBuffer(mockAnalyser, [0, 255]);
    const handle = createLipSyncAnalyzer(makeStream());
    // normalized: -1 and +1 → RMS = 1.0
    expect(handle.getRms()).toBeCloseTo(1.0, 1);
  });

  it('半振幅 (交互 64/192) → getRms() は約 0.5', () => {
    // 64 → (64-128)/128 = -0.5, 192 → (192-128)/128 = 0.5 → RMS = 0.5
    fillBuffer(mockAnalyser, [64, 192]);
    const handle = createLipSyncAnalyzer(makeStream());
    expect(handle.getRms()).toBeCloseTo(0.5, 1);
  });

  it('close() → source.disconnect と AudioContext.close が呼ばれる', () => {
    fillBuffer(mockAnalyser, [128]);
    const handle = createLipSyncAnalyzer(makeStream());
    handle.close();
    expect(mockDisconnect).toHaveBeenCalledOnce();
    expect(mockClose).toHaveBeenCalledOnce();
  });

  it('source が analyser に connect される', () => {
    fillBuffer(mockAnalyser, [128]);
    createLipSyncAnalyzer(makeStream());
    expect(mockConnect).toHaveBeenCalledWith(mockAnalyser);
  });
});
