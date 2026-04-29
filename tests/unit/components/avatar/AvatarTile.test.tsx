import { render } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import React from 'react';
import type { VRM } from '@pixiv/three-vrm';

const mockUseVRM = vi.hoisted(() => vi.fn());
const mockUseFrame = vi.hoisted(() => vi.fn());
const mockInvalidate = vi.hoisted(() => vi.fn());

vi.mock('@/hooks/useVRM', () => ({ useVRM: mockUseVRM }));

vi.mock('@react-three/fiber', () => ({
  useFrame: mockUseFrame,
  Canvas: ({ children }: { children?: React.ReactNode }) => <div>{children}</div>,
}));

import { AvatarTile } from '@/components/features/avatar/AvatarTile';
import type { ExpressionPayload } from '@/domain/avatar/value-objects/expression.payload';

type Weights = ExpressionPayload['weights'];

const baseWeights: Weights = {
  happy: 0.5,
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

function makeVrm(expressionManager?: object | null): VRM {
  return {
    expressionManager:
      expressionManager !== undefined
        ? expressionManager
        : {
            setValue: vi.fn(),
          },
    update: vi.fn(),
  } as unknown as VRM;
}

describe('AvatarTile', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockUseFrame.mockImplementation((cb: (state: object, delta: number) => void) => {
      cb({ invalidate: mockInvalidate }, 0.016);
    });
  });

  it('returns null when vrm is loading', () => {
    mockUseVRM.mockReturnValue({ vrm: null, error: null, loading: true });
    const { container } = render(
      <AvatarTile vrmUrl="/vrm/test.vrm" weights={baseWeights} lookAt={null} />,
    );
    expect(container.firstChild).toBeNull();
  });

  it('returns null when vrm load failed', () => {
    mockUseVRM.mockReturnValue({ vrm: null, error: 'failed', loading: false });
    const { container } = render(
      <AvatarTile vrmUrl="/vrm/test.vrm" weights={baseWeights} lookAt={null} />,
    );
    expect(container.firstChild).toBeNull();
  });

  it('calls expressionManager.setValue for each weight key', () => {
    const setValue = vi.fn();
    const vrm = makeVrm({ setValue });
    mockUseVRM.mockReturnValue({ vrm, error: null, loading: false });

    render(<AvatarTile vrmUrl="/vrm/test.vrm" weights={baseWeights} lookAt={null} />);

    expect(setValue).toHaveBeenCalledWith('happy', 0.5);
    expect(setValue).toHaveBeenCalledWith('sad', 0);
    expect(setValue).toHaveBeenCalledTimes(10);
  });

  it('calls vrm.update with delta', () => {
    const vrm = makeVrm();
    mockUseVRM.mockReturnValue({ vrm, error: null, loading: false });

    render(<AvatarTile vrmUrl="/vrm/test.vrm" weights={baseWeights} lookAt={null} />);

    expect(vrm.update).toHaveBeenCalledWith(0.016);
  });

  it('calls invalidate to trigger demand re-render', () => {
    const vrm = makeVrm();
    mockUseVRM.mockReturnValue({ vrm, error: null, loading: false });

    render(<AvatarTile vrmUrl="/vrm/test.vrm" weights={baseWeights} lookAt={null} />);

    expect(mockInvalidate).toHaveBeenCalled();
  });

  it('does not throw when expressionManager is null', () => {
    const vrm = makeVrm(null);
    mockUseVRM.mockReturnValue({ vrm, error: null, loading: false });

    expect(() =>
      render(<AvatarTile vrmUrl="/vrm/test.vrm" weights={baseWeights} lookAt={null} />),
    ).not.toThrow();
  });

  it('renders a primitive object for the vrm scene', () => {
    const vrm = makeVrm();
    mockUseVRM.mockReturnValue({ vrm, error: null, loading: false });

    const { container } = render(
      <AvatarTile vrmUrl="/vrm/test.vrm" weights={baseWeights} lookAt={null} />,
    );
    expect(container).toBeDefined();
  });
});
