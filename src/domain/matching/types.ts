import type { PairId, TableId, UserId } from '@/shared/types/ids';
import type { Gender } from '@/domain/user/value-objects/gender.vo';
import type { VotePriority } from '@/domain/matching/value-objects/vote-priority.vo';

export type { Result } from '@/domain/shared/types/result';
export { ok, err } from '@/domain/shared/types/result';

/** Gender balance fallback order when 2:2 per table is not achievable */
export type GenderFallback = '2m1f' | '1m2f' | '3m0f';

/** Policy governing table sizes and gender balance (hard constraints per spec) */
export type SeatPolicy = Readonly<{
  tableCount: number;
  minSeatsPerTable: 3;
  maxSeatsPerTable: 4;
  fallbackOrder: ReadonlyArray<GenderFallback>;
}>;

/** A single participant in the k-partition matching algorithm */
export type Participant = Readonly<{
  id: UserId;
  gender: Gender;
  /** Null when not a presenter; non-null triggers the same-table exclusion constraint */
  presenterPairId: PairId | null;
}>;

/** A single vote cast by a participant (rank 1 = highest priority) */
export type Vote = Readonly<{
  voterId: UserId;
  voteeId: UserId;
  rank: VotePriority;
}>;

/** Complete domain input to the k-partition 2-opt algorithm */
export type VoteSet = Readonly<{
  participants: ReadonlyArray<Participant>;
  votes: ReadonlyArray<Vote>;
  policy: SeatPolicy;
}>;

/** A single table in the matching result */
export type TableAssignment = Readonly<{
  id: TableId;
  members: ReadonlyArray<UserId>;
  seatCount: 3 | 4;
}>;

/** Full matching result: assigned tables and any unassigned participants */
export type TableAssignmentPlan = Readonly<{
  tables: ReadonlyArray<TableAssignment>;
  leftovers: ReadonlyArray<UserId>;
  score: number;
}>;
