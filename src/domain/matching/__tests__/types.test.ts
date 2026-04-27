import { describe, expect, it } from 'vitest';
import { ok, err } from '@/domain/matching/types';
import type {
  GenderFallback,
  Participant,
  SeatPolicy,
  TableAssignment,
  TableAssignmentPlan,
  Vote,
  VoteSet,
  Result,
} from '@/domain/matching/types';
import { asUserId, asPairId, asTableId } from '@/shared/types/ids';

describe('types — SeatPolicy', () => {
  it('constrains minSeatsPerTable to literal 3 and maxSeatsPerTable to literal 4', () => {
    const policy: SeatPolicy = {
      tableCount: 5,
      minSeatsPerTable: 3,
      maxSeatsPerTable: 4,
      fallbackOrder: ['2m1f', '1m2f'],
    };
    expect(policy.minSeatsPerTable).toBe(3);
    expect(policy.maxSeatsPerTable).toBe(4);
  });

  it('accepts all valid GenderFallback values', () => {
    const allFallbacks: ReadonlyArray<GenderFallback> = ['2m1f', '1m2f', '3m0f', '0m3f'];
    const policy: SeatPolicy = {
      tableCount: 3,
      minSeatsPerTable: 3,
      maxSeatsPerTable: 4,
      fallbackOrder: allFallbacks,
    };
    expect(policy.fallbackOrder).toHaveLength(4);
  });
});

describe('types — Participant', () => {
  it('constructs a presenter participant with a pairId', () => {
    const p: Participant = {
      id: asUserId('u-1'),
      gender: 'female',
      presenterPairId: asPairId('pair-1'),
    };
    expect(p.presenterPairId).not.toBeNull();
  });

  it('constructs a non-presenter participant with null pairId', () => {
    const p: Participant = {
      id: asUserId('u-2'),
      gender: 'male',
      presenterPairId: null,
    };
    expect(p.presenterPairId).toBeNull();
  });

  it('accepts gender "other"', () => {
    const p: Participant = {
      id: asUserId('u-3'),
      gender: 'other',
      presenterPairId: null,
    };
    expect(p.gender).toBe('other');
  });
});

describe('types — Vote', () => {
  it('constructs a vote with rank 1', () => {
    const v: Vote = {
      voterId: asUserId('u-1'),
      voteeId: asUserId('u-2'),
      rank: 1,
    };
    expect(v.rank).toBe(1);
  });

  it('constructs votes for each rank', () => {
    const ranks = [1, 2, 3] as const;
    ranks.forEach((rank) => {
      const v: Vote = { voterId: asUserId('u-1'), voteeId: asUserId('u-2'), rank };
      expect(v.rank).toBe(rank);
    });
  });
});

describe('types — VoteSet', () => {
  const policy: SeatPolicy = {
    tableCount: 3,
    minSeatsPerTable: 3,
    maxSeatsPerTable: 4,
    fallbackOrder: ['2m1f', '1m2f'],
  };

  it('constructs a minimal VoteSet with empty votes', () => {
    const voteSet: VoteSet = {
      participants: [
        { id: asUserId('u-1'), gender: 'female', presenterPairId: null },
        { id: asUserId('u-2'), gender: 'male', presenterPairId: null },
      ],
      votes: [],
      policy,
    };
    expect(voteSet.votes).toHaveLength(0);
    expect(voteSet.participants).toHaveLength(2);
  });
});

describe('types — TableAssignment', () => {
  it('constructs a table with seatCount 4', () => {
    const t: TableAssignment = {
      id: asTableId('tbl-1'),
      members: [asUserId('u-1'), asUserId('u-2'), asUserId('u-3'), asUserId('u-4')],
      seatCount: 4,
    };
    expect(t.members).toHaveLength(4);
    expect(t.seatCount).toBe(4);
  });

  it('constructs a table with seatCount 3', () => {
    const t: TableAssignment = {
      id: asTableId('tbl-2'),
      members: [asUserId('u-1'), asUserId('u-2'), asUserId('u-3')],
      seatCount: 3,
    };
    expect(t.seatCount).toBe(3);
  });
});

describe('types — TableAssignmentPlan', () => {
  it('constructs a plan with no leftovers (normal case)', () => {
    const plan: TableAssignmentPlan = {
      tables: [
        {
          id: asTableId('tbl-1'),
          members: [asUserId('u-1'), asUserId('u-2'), asUserId('u-3'), asUserId('u-4')],
          seatCount: 4,
        },
      ],
      leftovers: [],
      score: 9,
    };
    expect(plan.leftovers).toHaveLength(0);
    expect(plan.score).toBe(9);
  });
});

describe('types — Result (re-export from domain shared)', () => {
  it('ok() produces a success result', () => {
    const r: Result<number, string> = ok(42);
    expect(r.ok).toBe(true);
    if (r.ok) expect(r.value).toBe(42);
  });

  it('err() produces a failure result', () => {
    const r: Result<number, string> = err('something went wrong');
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.error).toBe('something went wrong');
  });
});
