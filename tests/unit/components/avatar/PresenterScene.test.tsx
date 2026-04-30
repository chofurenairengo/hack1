import { render, screen } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import React from 'react';

// --- hoisted mocks ---
const mockUseAvatarSync = vi.hoisted(() => vi.fn());
const mockGetPresetByKey = vi.hoisted(() => vi.fn());

vi.mock('@/hooks/useAvatarSync', () => ({ useAvatarSync: mockUseAvatarSync }));
vi.mock('@/infrastructure/vrm/preset-registry', () => ({ getPresetByKey: mockGetPresetByKey }));
vi.mock('@/components/features/avatar/AvatarCanvas', () => ({
  AvatarCanvas: ({ children, className }: { children?: React.ReactNode; className?: string }) => (
    <div data-testid="avatar-canvas" className={className}>
      {children}
    </div>
  ),
}));

const capturedTileProps: Array<{ vrmUrl: string; weights: object }> = [];
vi.mock('@/components/features/avatar/AvatarTile', () => ({
  AvatarTile: (props: { vrmUrl: string; weights: object }) => {
    capturedTileProps.push(props);
    return <div data-testid="avatar-tile" data-vrm-url={props.vrmUrl} />;
  },
}));

import { PresenterScene } from '@/components/features/avatar/PresenterScene';
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

const presenterUserId = asUserId('user-presenter');
const presenteeUserId = asUserId('user-presentee');

const defaultProps = {
  eventId: asEventId('event-1'),
  pairId: asPairId('pair-1'),
  presenterUserId,
  presenteeUserId,
  presenterPresetKey: 'sample_a_woman' as AvatarPresetKey,
  presenteePresetKey: 'sample_c_man' as AvatarPresetKey,
};

const presenterPreset = {
  key: 'sample_a_woman',
  vrmUrl: '/vrm/sample_a_woman.vrm',
  displayName: 'アバター A (女性)',
};
const presenteePreset = {
  key: 'sample_c_man',
  vrmUrl: '/vrm/sample_c_man.vrm',
  displayName: 'アバター C (男性)',
};

describe('PresenterScene', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    capturedTileProps.length = 0;
    mockUseAvatarSync.mockReturnValue({ emit: vi.fn(), expressions: {} });
    mockGetPresetByKey.mockImplementation((key: string) => {
      if (key === 'sample_a_woman') return presenterPreset;
      if (key === 'sample_c_man') return presenteePreset;
      return undefined;
    });
  });

  it('renders two AvatarCanvas and two AvatarTiles when both presets found', () => {
    render(<PresenterScene {...defaultProps} />);
    expect(screen.getAllByTestId('avatar-canvas')).toHaveLength(2);
    expect(screen.getAllByTestId('avatar-tile')).toHaveLength(2);
  });

  it('passes correct vrmUrls to each AvatarTile', () => {
    render(<PresenterScene {...defaultProps} />);
    const tiles = screen.getAllByTestId('avatar-tile');
    const urls = tiles.map((t) => t.getAttribute('data-vrm-url'));
    expect(urls).toContain('/vrm/sample_a_woman.vrm');
    expect(urls).toContain('/vrm/sample_c_man.vrm');
  });

  it('shows error alert when presenter preset is not found', () => {
    mockGetPresetByKey.mockImplementation((key: string) => {
      if (key === 'sample_c_man') return presenteePreset;
      return undefined;
    });
    render(<PresenterScene {...defaultProps} />);
    expect(screen.getByRole('alert')).toBeInTheDocument();
    expect(screen.queryByTestId('avatar-canvas')).not.toBeInTheDocument();
  });

  it('shows error alert when presentee preset is not found', () => {
    mockGetPresetByKey.mockImplementation((key: string) => {
      if (key === 'sample_a_woman') return presenterPreset;
      return undefined;
    });
    render(<PresenterScene {...defaultProps} />);
    expect(screen.getByRole('alert')).toBeInTheDocument();
    expect(screen.queryByTestId('avatar-canvas')).not.toBeInTheDocument();
  });

  it('renders slideContent in center slot when provided', () => {
    render(
      <PresenterScene
        {...defaultProps}
        slideContent={<div data-testid="slide-renderer">slide</div>}
      />,
    );
    expect(screen.getByTestId('slide-renderer')).toBeInTheDocument();
    expect(screen.queryByText('スライド準備中')).not.toBeInTheDocument();
  });

  it('renders placeholder text when no slideContent provided', () => {
    render(<PresenterScene {...defaultProps} />);
    expect(screen.getByText('スライド準備中')).toBeInTheDocument();
  });

  it('passes zero weights to tiles when userId not present in expressions', () => {
    render(<PresenterScene {...defaultProps} />);
    expect(capturedTileProps).toHaveLength(2);
    const [first, second] = capturedTileProps;
    expect(first?.weights).toEqual(zeroWeights);
    expect(second?.weights).toEqual(zeroWeights);
  });

  it('passes expressions weights to tiles when userId present in expressions', () => {
    const weights: Weights = {
      happy: 0.8,
      sad: 0,
      angry: 0,
      relaxed: 0,
      surprised: 0,
      aa: 0.5,
      ih: 0,
      ou: 0,
      ee: 0,
      oh: 0,
    };
    mockUseAvatarSync.mockReturnValue({
      emit: vi.fn(),
      expressions: {
        [presenterUserId]: { userId: presenterUserId, weights, lookAt: null, ts: 0 },
      },
    });
    render(<PresenterScene {...defaultProps} />);
    const presenterTileProps = capturedTileProps.find(
      (p) => p.vrmUrl === '/vrm/sample_a_woman.vrm',
    );
    expect(presenterTileProps?.weights).toEqual(weights);
  });

  it('has accessible region labels for presenter and presentee', () => {
    render(<PresenterScene {...defaultProps} />);
    expect(screen.getByRole('region', { name: '紹介者アバター' })).toBeInTheDocument();
    expect(screen.getByRole('region', { name: '被紹介者アバター' })).toBeInTheDocument();
    expect(screen.getByRole('region', { name: 'スライド表示' })).toBeInTheDocument();
  });

  it('calls useAvatarSync with correct eventId and pairId', () => {
    render(<PresenterScene {...defaultProps} />);
    expect(mockUseAvatarSync).toHaveBeenCalledWith(defaultProps.eventId, defaultProps.pairId);
  });
});
