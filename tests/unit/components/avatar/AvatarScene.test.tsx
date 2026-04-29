import { render, screen, act } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import React from 'react';

// --- hoisted mocks ---
const mockEmit = vi.hoisted(() => vi.fn());
const mockUseFaceLandmarker = vi.hoisted(() => vi.fn());
const mockUseAvatarSync = vi.hoisted(() => vi.fn());
const mockGetPresetByKey = vi.hoisted(() => vi.fn());

vi.mock('@/hooks/useFaceLandmarker', () => ({ useFaceLandmarker: mockUseFaceLandmarker }));
vi.mock('@/hooks/useAvatarSync', () => ({ useAvatarSync: mockUseAvatarSync }));
vi.mock('@/infrastructure/vrm/preset-registry', () => ({ getPresetByKey: mockGetPresetByKey }));
vi.mock('@/components/features/avatar/AvatarCanvas', () => ({
  AvatarCanvas: ({ children }: { children?: React.ReactNode }) => (
    <div data-testid="avatar-canvas">{children}</div>
  ),
}));
vi.mock('@/components/features/avatar/AvatarTile', () => ({
  AvatarTile: (props: object) => <div data-testid="avatar-tile" {...props} />,
}));

import { AvatarScene } from '@/components/features/avatar/AvatarScene';
import { asEventId, asPairId, asUserId } from '@/shared/types/ids';
import type { AvatarPresetKey } from '@/infrastructure/vrm/preset-registry';
import type { ExpressionPayload } from '@/domain/avatar/value-objects/expression.payload';

type Weights = ExpressionPayload['weights'];

const zeroWeights: Weights = {
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

const highWeights: Weights = {
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

function setupDefaultMocks(blendShapes: Weights | null = null) {
  mockUseFaceLandmarker.mockReturnValue({ blendShapes, isReady: true, error: null });
  mockUseAvatarSync.mockReturnValue({ emit: mockEmit, expressions: {} });
  mockGetPresetByKey.mockReturnValue(fakePreset);
}

describe('AvatarScene', () => {
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

    Object.defineProperty(navigator, 'permissions', {
      writable: true,
      value: {
        query: vi.fn().mockResolvedValue({ state: 'granted' }),
      },
    });
  });

  afterEach(() => {
    vi.useRealTimers();
    window.matchMedia = originalMatchMedia;
  });

  it('renders AvatarCanvas and AvatarTile when preset is found', async () => {
    setupDefaultMocks();
    await act(async () => {
      render(<AvatarScene {...defaultProps} />);
    });
    expect(screen.getByTestId('avatar-canvas')).toBeInTheDocument();
    expect(screen.getByTestId('avatar-tile')).toBeInTheDocument();
  });

  it('shows fallback UI when preset is not found', async () => {
    mockGetPresetByKey.mockReturnValue(undefined);
    mockUseFaceLandmarker.mockReturnValue({ blendShapes: null, isReady: false, error: null });
    mockUseAvatarSync.mockReturnValue({ emit: mockEmit, expressions: {} });

    await act(async () => {
      render(<AvatarScene {...defaultProps} />);
    });
    expect(screen.queryByTestId('avatar-canvas')).not.toBeInTheDocument();
  });

  it('throttles emit to at most 1 call per 33ms', async () => {
    const weights1 = { ...highWeights };
    mockUseFaceLandmarker.mockReturnValue({ blendShapes: weights1, isReady: true, error: null });
    mockUseAvatarSync.mockReturnValue({ emit: mockEmit, expressions: {} });
    mockGetPresetByKey.mockReturnValue(fakePreset);

    let rerenderFn!: (ui: React.ReactElement) => void;
    await act(async () => {
      const { rerender } = render(<AvatarScene {...defaultProps} />);
      rerenderFn = rerender;
    });
    const countAfterMount = mockEmit.mock.calls.length;

    // New blendShapes reference before 33ms elapses — must not emit again
    const weights2 = { ...highWeights };
    mockUseFaceLandmarker.mockReturnValue({ blendShapes: weights2, isReady: true, error: null });
    await act(async () => {
      rerenderFn(<AvatarScene {...defaultProps} />);
    });
    expect(mockEmit.mock.calls.length).toBe(countAfterMount);

    // Advance past 33ms, then trigger with a new reference — must emit
    vi.advanceTimersByTime(33);
    const weights3 = { ...highWeights };
    mockUseFaceLandmarker.mockReturnValue({ blendShapes: weights3, isReady: true, error: null });
    await act(async () => {
      rerenderFn(<AvatarScene {...defaultProps} />);
    });
    expect(mockEmit.mock.calls.length).toBeGreaterThan(countAfterMount);
  });

  it('does not emit when prefers-reduced-motion is true and max weight < 0.3', async () => {
    window.matchMedia = vi.fn().mockReturnValue({
      matches: true,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
    });

    const lowWeights: Weights = { ...zeroWeights, happy: 0.1 };
    setupDefaultMocks(lowWeights);

    await act(async () => {
      render(<AvatarScene {...defaultProps} />);
    });
    await act(async () => {
      vi.advanceTimersByTime(100);
    });

    expect(mockEmit).not.toHaveBeenCalled();
  });

  it('does emit when prefers-reduced-motion is true but max weight >= 0.3', async () => {
    window.matchMedia = vi.fn().mockReturnValue({
      matches: true,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
    });

    setupDefaultMocks(highWeights);

    await act(async () => {
      render(<AvatarScene {...defaultProps} />);
    });
    await act(async () => {
      vi.advanceTimersByTime(100);
    });

    expect(mockEmit).toHaveBeenCalled();
  });

  it('passes vrmUrl from preset to AvatarTile', async () => {
    setupDefaultMocks();
    await act(async () => {
      render(<AvatarScene {...defaultProps} />);
    });
    const tile = screen.getByTestId('avatar-tile');
    expect(tile).toHaveAttribute('vrmUrl', '/vrm/sample_a_woman.vrm');
  });
});
