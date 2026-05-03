import { render, screen, fireEvent, act } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import React from 'react';

// --- hoisted mocks ---
const mockEmit = vi.hoisted(() => vi.fn());
const mockUseFaceLandmarker = vi.hoisted(() => vi.fn());
const mockUseAvatarSync = vi.hoisted(() => vi.fn());
const mockUseLipSync = vi.hoisted(() => vi.fn());
const mockUseAvatarPerf = vi.hoisted(() => vi.fn());
const mockGetPresetByKey = vi.hoisted(() => vi.fn());
const mockRequestPermission = vi.hoisted(() => vi.fn());
const mockUseCameraPermission = vi.hoisted(() => vi.fn());
const mockAvatarTileSpy = vi.hoisted(() => vi.fn());

vi.mock('@/hooks/useFaceLandmarker', () => ({ useFaceLandmarker: mockUseFaceLandmarker }));
vi.mock('@/hooks/useAvatarSync', () => ({ useAvatarSync: mockUseAvatarSync }));
vi.mock('@/hooks/useLipSync', () => ({ useLipSync: mockUseLipSync }));
vi.mock('@/hooks/useAvatarPerf', () => ({ useAvatarPerf: mockUseAvatarPerf }));
vi.mock('@/infrastructure/vrm/preset-registry', () => ({ getPresetByKey: mockGetPresetByKey }));
vi.mock('@/hooks/useCameraPermission', () => ({ useCameraPermission: mockUseCameraPermission }));
vi.mock('@/components/features/avatar/AvatarCanvas', () => ({
  AvatarCanvas: ({ children }: { children?: React.ReactNode }) => (
    <div data-testid="avatar-canvas">{children}</div>
  ),
}));
vi.mock('@/components/features/avatar/AvatarTile', () => ({
  AvatarTile: (props: { vrmUrl: string; weights: object }) => {
    mockAvatarTileSpy(props);
    return <div data-testid="avatar-tile" />;
  },
}));

import { AvatarScene } from '@/components/features/avatar/AvatarScene';
import { asEventId, asPairId, asUserId } from '@/shared/types/ids';
import type { AvatarPresetKey } from '@/infrastructure/vrm/preset-registry';
import type { ExpressionPayload } from '@/domain/avatar/value-objects/expression.payload';

type Weights = ExpressionPayload['weights'];

const DEFAULT_WEIGHTS: Weights = {
  happy: 0,
  sad: 0,
  angry: 0,
  relaxed: 0,
  surprised: 0,
  aa: 0,
  ih: 0,
  ou: 0,
  ee: 0,
  oh: 0,
};

const HIGH_WEIGHTS: Weights = {
  happy: 0.9,
  sad: 0,
  angry: 0,
  relaxed: 0,
  surprised: 0,
  aa: 0,
  ih: 0,
  ou: 0,
  ee: 0,
  oh: 0,
};

const defaultProps = {
  eventId: asEventId('event-1'),
  pairId: asPairId('pair-1'),
  selfUserId: asUserId('user-1'),
  selfPresetKey: 'sample_a_woman' as AvatarPresetKey,
};

const fakePreset = { key: 'sample_a_woman', vrmUrl: '/vrm/sample_a_woman.vrm', displayName: 'A' };

let originalMatchMedia: typeof window.matchMedia;

beforeEach(() => {
  vi.clearAllMocks();
  vi.useFakeTimers();

  originalMatchMedia = window.matchMedia;
  window.matchMedia = vi.fn().mockReturnValue({
    matches: false,
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
  });

  Object.defineProperty(navigator, 'mediaDevices', {
    writable: true,
    value: {
      getUserMedia: vi.fn().mockResolvedValue({
        getTracks: () => [{ stop: vi.fn() }],
      }),
    },
  });

  mockUseFaceLandmarker.mockReturnValue({ blendShapes: null, isReady: false, error: null });
  mockUseAvatarSync.mockReturnValue({ emit: mockEmit, expressions: {} });
  mockUseLipSync.mockReturnValue({ rms: 0 });
  mockUseAvatarPerf.mockReturnValue({ mediapipeTargetFps: 30, disableEffects: false });
  mockGetPresetByKey.mockReturnValue(fakePreset);
  mockUseCameraPermission.mockReturnValue({
    permissionState: 'granted',
    requestPermission: mockRequestPermission,
  });
});

afterEach(() => {
  vi.useRealTimers();
  window.matchMedia = originalMatchMedia;
});

describe('AvatarScene — Accessibility', () => {
  it("'checking' state → loading indicator is shown, no avatar canvas", async () => {
    mockUseCameraPermission.mockReturnValue({
      permissionState: 'checking',
      requestPermission: mockRequestPermission,
    });
    await act(async () => {
      render(<AvatarScene {...defaultProps} />);
    });
    expect(screen.getByRole('status')).toHaveTextContent('カメラを確認中...');
    expect(screen.queryByTestId('avatar-canvas')).not.toBeInTheDocument();
  });

  it("'prompt' state → permission button shown, static avatar with DEFAULT_WEIGHTS", async () => {
    mockUseCameraPermission.mockReturnValue({
      permissionState: 'prompt',
      requestPermission: mockRequestPermission,
    });
    await act(async () => {
      render(<AvatarScene {...defaultProps} />);
    });
    expect(screen.getByRole('button', { name: 'カメラを許可する' })).toBeInTheDocument();
    expect(screen.getByTestId('avatar-canvas')).toBeInTheDocument();
    expect(mockAvatarTileSpy.mock.lastCall?.[0]?.weights).toEqual(DEFAULT_WEIGHTS);
  });

  it("'denied' state → 音声のみで参加中 badge shown, static avatar with DEFAULT_WEIGHTS", async () => {
    mockUseCameraPermission.mockReturnValue({
      permissionState: 'denied',
      requestPermission: mockRequestPermission,
    });
    await act(async () => {
      render(<AvatarScene {...defaultProps} />);
    });
    expect(screen.getByText('音声のみで参加中')).toBeInTheDocument();
    expect(screen.getByTestId('avatar-canvas')).toBeInTheDocument();
    expect(mockAvatarTileSpy.mock.lastCall?.[0]?.weights).toEqual(DEFAULT_WEIGHTS);
  });

  it("'unsupported' state → same fallback as denied", async () => {
    mockUseCameraPermission.mockReturnValue({
      permissionState: 'unsupported',
      requestPermission: mockRequestPermission,
    });
    await act(async () => {
      render(<AvatarScene {...defaultProps} />);
    });
    expect(screen.getByText('音声のみで参加中')).toBeInTheDocument();
    expect(screen.getByTestId('avatar-canvas')).toBeInTheDocument();
    expect(mockAvatarTileSpy.mock.lastCall?.[0]?.weights).toEqual(DEFAULT_WEIGHTS);
  });

  it("prefers-reduced-motion=true, 'granted' → emit not called, DEFAULT_WEIGHTS passed to AvatarTile", async () => {
    window.matchMedia = vi.fn().mockReturnValue({
      matches: true,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
    });
    mockUseFaceLandmarker.mockReturnValue({
      blendShapes: HIGH_WEIGHTS,
      isReady: true,
      error: null,
    });

    await act(async () => {
      render(<AvatarScene {...defaultProps} />);
    });
    await act(async () => {
      vi.advanceTimersByTime(100);
    });

    expect(mockEmit).not.toHaveBeenCalled();
    expect(mockAvatarTileSpy.mock.lastCall?.[0]?.weights).toEqual(DEFAULT_WEIGHTS);
  });

  it("prefers-reduced-motion=false, 'granted', blendShapes available → emit called after throttle window", async () => {
    mockUseFaceLandmarker.mockReturnValue({
      blendShapes: HIGH_WEIGHTS,
      isReady: true,
      error: null,
    });

    let rerenderFn!: (ui: React.ReactElement) => void;
    await act(async () => {
      const { rerender } = render(<AvatarScene {...defaultProps} />);
      rerenderFn = rerender;
    });

    vi.advanceTimersByTime(33);
    mockUseFaceLandmarker.mockReturnValue({
      blendShapes: { ...HIGH_WEIGHTS },
      isReady: true,
      error: null,
    });
    await act(async () => {
      rerenderFn(<AvatarScene {...defaultProps} />);
    });

    expect(mockEmit).toHaveBeenCalled();
  });

  it("'prompt' → clicking permission button calls requestPermission", async () => {
    mockUseCameraPermission.mockReturnValue({
      permissionState: 'prompt',
      requestPermission: mockRequestPermission,
    });
    await act(async () => {
      render(<AvatarScene {...defaultProps} />);
    });
    fireEvent.click(screen.getByRole('button', { name: 'カメラを許可する' }));
    expect(mockRequestPermission).toHaveBeenCalledTimes(1);
  });

  it('preset not found → error alert, no avatar canvas', async () => {
    mockGetPresetByKey.mockReturnValue(undefined);
    await act(async () => {
      render(<AvatarScene {...defaultProps} />);
    });
    expect(screen.getByRole('alert')).toHaveTextContent('アバターを読み込めませんでした');
    expect(screen.queryByTestId('avatar-canvas')).not.toBeInTheDocument();
  });
});
