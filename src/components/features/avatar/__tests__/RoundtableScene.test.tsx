import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import type { TableMemberData } from '@/types/api';
import type { EventId, TableId, UserId } from '@/shared/types/ids';
import type { ExpressionPayload } from '@/domain/avatar/value-objects/expression.payload';

vi.mock('../AvatarCanvas', () => ({
  AvatarCanvas: ({
    children,
    className,
  }: {
    children: React.ReactNode;
    className?: string;
    transparent?: boolean;
  }) => (
    <div data-testid="avatar-canvas" className={className}>
      {children}
    </div>
  ),
}));

vi.mock('../AvatarTile', () => ({
  AvatarTile: ({ vrmUrl, weights }: { vrmUrl: string; weights: ExpressionPayload['weights'] }) => (
    <div data-testid="avatar-tile" data-vrm-url={vrmUrl} data-weights={JSON.stringify(weights)} />
  ),
}));

vi.mock('@react-three/fiber', () => ({
  useFrame: vi.fn(),
  useThree: () => ({
    camera: { position: { set: vi.fn() }, lookAt: vi.fn() },
    gl: { domElement: { addEventListener: vi.fn(), removeEventListener: vi.fn() } },
    invalidate: vi.fn(),
  }),
}));

const mockExpressions: Record<string, ExpressionPayload> = {};

vi.mock('@/hooks/useTableAvatarSync', () => ({
  useTableAvatarSync: () => ({
    emit: vi.fn(),
    expressions: mockExpressions,
  }),
}));

import { RoundtableScene } from '../RoundtableScene';

const EVENT_ID = 'evt-001' as unknown as EventId;
const TABLE_ID = 'tbl-001' as unknown as TableId;

const ZERO_WEIGHTS: ExpressionPayload['weights'] = {
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

function makeMember(i: number): TableMemberData {
  return {
    userId: `user-${i}` as unknown as TableMemberData['userId'],
    displayName: `Member ${i}`,
    avatarPresetKey: 'sample_c_man',
    gender: 'male',
  };
}

function makeMembers(count: number): ReadonlyArray<TableMemberData> {
  return Array.from({ length: count }, (_, i) => makeMember(i));
}

describe('RoundtableScene', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    for (const key of Object.keys(mockExpressions)) {
      delete mockExpressions[key];
    }
  });

  describe('valid member counts', () => {
    it('renders without alert for 3 members', () => {
      render(<RoundtableScene eventId={EVENT_ID} tableId={TABLE_ID} members={makeMembers(3)} />);
      expect(screen.queryByRole('alert')).toBeNull();
    });

    it('renders without alert for 4 members', () => {
      render(<RoundtableScene eventId={EVENT_ID} tableId={TABLE_ID} members={makeMembers(4)} />);
      expect(screen.queryByRole('alert')).toBeNull();
    });

    it('renders the AvatarCanvas for valid member count', () => {
      render(<RoundtableScene eventId={EVENT_ID} tableId={TABLE_ID} members={makeMembers(4)} />);
      expect(screen.getByTestId('avatar-canvas')).toBeTruthy();
    });
  });

  describe('invalid member counts', () => {
    it('shows alert for 2 members', () => {
      render(<RoundtableScene eventId={EVENT_ID} tableId={TABLE_ID} members={makeMembers(2)} />);
      expect(screen.getByRole('alert')).toBeTruthy();
    });

    it('shows alert for 5 members', () => {
      render(<RoundtableScene eventId={EVENT_ID} tableId={TABLE_ID} members={makeMembers(5)} />);
      expect(screen.getByRole('alert')).toBeTruthy();
    });

    it('shows alert for 0 members', () => {
      render(<RoundtableScene eventId={EVENT_ID} tableId={TABLE_ID} members={makeMembers(0)} />);
      expect(screen.getByRole('alert')).toBeTruthy();
    });
  });

  describe('selfIndex behaviour', () => {
    it('renders n-1 avatar tiles when selfIndex defaults to 0 (4 members)', () => {
      render(<RoundtableScene eventId={EVENT_ID} tableId={TABLE_ID} members={makeMembers(4)} />);
      const tiles = screen.getAllByTestId('avatar-tile');
      expect(tiles).toHaveLength(3);
    });

    it('renders n-1 avatar tiles when selfIndex defaults to 0 (3 members)', () => {
      render(<RoundtableScene eventId={EVENT_ID} tableId={TABLE_ID} members={makeMembers(3)} />);
      const tiles = screen.getAllByTestId('avatar-tile');
      expect(tiles).toHaveLength(2);
    });

    it('does not render the avatar tile for selfIndex member', () => {
      const members = makeMembers(4);
      render(
        <RoundtableScene eventId={EVENT_ID} tableId={TABLE_ID} members={members} selfIndex={0} />,
      );
      const tiles = screen.getAllByTestId('avatar-tile');
      expect(tiles).toHaveLength(3);
    });

    it('hides a different member when selfIndex=2', () => {
      const members = makeMembers(4);
      render(
        <RoundtableScene eventId={EVENT_ID} tableId={TABLE_ID} members={members} selfIndex={2} />,
      );
      const tiles = screen.getAllByTestId('avatar-tile');
      expect(tiles).toHaveLength(3);
    });
  });

  describe('expression weights', () => {
    it('passes ZERO_WEIGHTS to every tile when expressions is empty', () => {
      render(<RoundtableScene eventId={EVENT_ID} tableId={TABLE_ID} members={makeMembers(4)} />);
      const tiles = screen.getAllByTestId('avatar-tile');
      expect(tiles).toHaveLength(3);
      for (const tile of tiles) {
        const raw = tile.getAttribute('data-weights');
        expect(raw).not.toBeNull();
        expect(JSON.parse(raw!)).toEqual(ZERO_WEIGHTS);
      }
    });

    it('passes the actual weights when expressions has an entry for the user', () => {
      const populated: ExpressionPayload['weights'] = { ...ZERO_WEIGHTS, happy: 0.8 };
      const members = makeMembers(4);
      for (const member of members) {
        mockExpressions[member.userId as unknown as string] = {
          userId: member.userId as unknown as UserId,
          weights: populated,
          lookAt: null,
          ts: 1234,
        };
      }
      render(<RoundtableScene eventId={EVENT_ID} tableId={TABLE_ID} members={members} />);
      const tiles = screen.getAllByTestId('avatar-tile');
      expect(tiles).toHaveLength(3);
      for (const tile of tiles) {
        const raw = tile.getAttribute('data-weights');
        expect(raw).not.toBeNull();
        expect(JSON.parse(raw!)).toEqual(populated);
      }
    });
  });

  describe('className prop', () => {
    it('forwards className to the outer container', () => {
      const { container } = render(
        <RoundtableScene
          eventId={EVENT_ID}
          tableId={TABLE_ID}
          members={makeMembers(4)}
          className="h-full w-full"
        />,
      );
      expect(container.firstElementChild?.className).toContain('h-full');
    });
  });
});
