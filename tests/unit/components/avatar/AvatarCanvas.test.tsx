import { render, screen } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import React from 'react';

vi.mock('@react-three/fiber', () => ({
  Canvas: ({ children, ...props }: { children?: React.ReactNode; [key: string]: unknown }) => (
    <div data-testid="r3f-canvas" {...props}>
      {children}
    </div>
  ),
}));

import { AvatarCanvas } from '@/components/features/avatar/AvatarCanvas';

describe('AvatarCanvas', () => {
  it('renders the R3F canvas container', () => {
    render(<AvatarCanvas />);
    expect(screen.getByTestId('r3f-canvas')).toBeInTheDocument();
  });

  it('renders children inside the canvas', () => {
    render(
      <AvatarCanvas>
        <div data-testid="child">child</div>
      </AvatarCanvas>,
    );
    expect(screen.getByTestId('child')).toBeInTheDocument();
  });

  it('applies className to wrapper element', () => {
    render(<AvatarCanvas className="my-class" />);
    expect(document.querySelector('.my-class')).toBeInTheDocument();
  });

  it('passes frameloop="always" to Canvas', () => {
    render(<AvatarCanvas />);
    const canvas = screen.getByTestId('r3f-canvas');
    expect(canvas).toHaveAttribute('frameloop', 'always');
  });
});
