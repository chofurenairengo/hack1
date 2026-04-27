import { describe, expect, it } from 'vitest';
import { ok, err } from '@/domain/matching/types';
import type {
  Participant,
  ParticipantRole,
  SeatPolicy,
  TableAssignment,
  TableAssignmentPlan,
  Vote,
  VoteSet,
  Result,
} from '@/domain/matching/types';
import { asUserId, asTableId } from '@/shared/types/ids';

const defaultPolicy: SeatPolicy = {
  allowedTableSizes: [3, 4],
  softWeights: { genderBalance22: 1, mixedTable: 1, mutualVoteRank: 1 },
};

describe('types — SeatPolicy', () => {
  it('accepts standard allowedTableSizes [3, 4]', () => {
    const policy: SeatPolicy = {
      allowedTableSizes: [3, 4],
      softWeights: { genderBalance22: 1, mixedTable: 1, mutualVoteRank: 1 },
    };
    expect(policy.allowedTableSizes).toEqual([3, 4]);
  });

  it('accepts N=5 exception allowedTableSizes [3, 4, 5]', () => {
    const policy: SeatPolicy = {
      allowedTableSizes: [3, 4, 5],
      softWeights: { genderBalance22: 2, mixedTable: 1, mutualVoteRank: 0.5 },
    };
    expect(policy.allowedTableSizes).toContain(5);
  });

  it('holds softWeights for all three objectives', () => {
    expect(defaultPolicy.softWeights.genderBalance22).toBe(1);
    expect(defaultPolicy.softWeights.mixedTable).toBe(1);
    expect(defaultPolicy.softWeights.mutualVoteRank).toBe(1);
  });
});

describe('types — ParticipantRole', () => {
  it('accepts presenter role', () => {
    const role: ParticipantRole = 'presenter';
    expect(role).toBe('presenter');
  });

  it('accepts presentee role', () => {
    const role: ParticipantRole = 'presentee';
    expect(role).toBe('presentee');
  });
});

describe('types — Participant', () => {
  it('constructs a presenter participant', () => {
    const p: Participant = {
      id: asUserId('u-1'),
      gender: 'female',
      role: 'presenter',
    };
    expect(p.role).toBe('presenter');
  });

  it('constructs a presentee participant', () => {
    const p: Participant = {
      id: asUserId('u-2'),
      gender: 'male',
      role: 'presentee',
    };
    expect(p.role).toBe('presentee');
  });

  it('accepts gender "other"', () => {
    const p: Participant = {
      id: asUserId('u-3'),
      gender: 'other',
      role: 'presentee',
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
  it('constructs a VoteSet with mixed presenter/presentee participants', () => {
    const voteSet: VoteSet = {
      participants: [
        { id: asUserId('u-1'), gender: 'female', role: 'presenter' },
        { id: asUserId('u-2'), gender: 'male', role: 'presentee' },
      ],
      votes: [],
      policy: defaultPolicy,
    };
    expect(voteSet.participants).toHaveLength(2);
    const [first, second] = voteSet.participants;
    expect(first?.role).toBe('presenter');
    expect(second?.role).toBe('presentee');
  });

  it('constructs a minimal VoteSet with empty votes', () => {
    const voteSet: VoteSet = {
      participants: [
        { id: asUserId('u-1'), gender: 'female', role: 'presentee' },
        { id: asUserId('u-2'), gender: 'male', role: 'presentee' },
      ],
      votes: [],
      policy: defaultPolicy,
    };
    expect(voteSet.votes).toHaveLength(0);
  });
});

describe('types — TableAssignment', () => {
  it('constructs a 2:2 gender-balanced table', () => {
    const t: TableAssignment = {
      id: asTableId('tbl-1'),
      members: [asUserId('u-1'), asUserId('u-2'), asUserId('u-3'), asUserId('u-4')],
      seatCount: 4,
      is22: true,
      isMixed: true,
      mutualRankScore: 6,
    };
    expect(t.is22).toBe(true);
    expect(t.isMixed).toBe(true);
    expect(t.seatCount).toBe(4);
  });

  it('constructs a 3-person table', () => {
    const t: TableAssignment = {
      id: asTableId('tbl-2'),
      members: [asUserId('u-1'), asUserId('u-2'), asUserId('u-3')],
      seatCount: 3,
      is22: false,
      isMixed: true,
      mutualRankScore: 3,
    };
    expect(t.seatCount).toBe(3);
    expect(t.is22).toBe(false);
  });

  it('constructs a 5-person table for N=5 exception', () => {
    const t: TableAssignment = {
      id: asTableId('tbl-3'),
      members: [
        asUserId('u-1'),
        asUserId('u-2'),
        asUserId('u-3'),
        asUserId('u-4'),
        asUserId('u-5'),
      ],
      seatCount: 5,
      is22: false,
      isMixed: true,
      mutualRankScore: 9,
    };
    expect(t.seatCount).toBe(5);
  });

  it('constructs a same-gender-only table (isMixed false)', () => {
    const t: TableAssignment = {
      id: asTableId('tbl-4'),
      members: [asUserId('u-1'), asUserId('u-2'), asUserId('u-3')],
      seatCount: 3,
      is22: false,
      isMixed: false,
      mutualRankScore: 0,
    };
    expect(t.isMixed).toBe(false);
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
          is22: true,
          isMixed: true,
          mutualRankScore: 6,
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
