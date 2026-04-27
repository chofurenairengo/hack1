import type { TableId, UserId } from '@/shared/types/ids';
import type { Gender } from '@/domain/user/value-objects/gender.vo';
import type { VotePriority } from '@/domain/matching/value-objects/vote-priority.vo';

export type { Result } from '@/domain/shared/types/result';
export { ok, err } from '@/domain/shared/types/result';

/** Policy governing allowed table sizes and soft objective weights */
export type SeatPolicy = Readonly<{
  /** 通常は [3, 4]。被紹介者 N=5 のみ [3, 4, 5] を渡す */
  allowedTableSizes: readonly [3, 4] | readonly [3, 4, 5];
  softWeights: Readonly<{
    /** 加重和スコアの乗数 (辞書式1位相当): 相互投票 rank 合計を最大化 (rank1=3, rank2=2, rank3=1) */
    mutualVoteRank: number;
    /** 加重和スコアの乗数 (辞書式2位相当): 4人卓中 female 2 / male 2 テーブル数を最大化 */
    genderBalance22: number;
    /** 加重和スコアの乗数 (辞書式3位相当): 同性のみ卓を最小化 */
    mixedTable: number;
  }>;
}>;

/** Role of a participant in the event pair */
export type ParticipantRole = 'presenter' | 'presentee';

/** A single participant in the k-partition matching algorithm */
export type Participant = Readonly<{
  id: UserId;
  gender: Gender;
  /** presenter は交流タイム卓に不参加。アルゴリズムは presentee のみを対象とする */
  role: ParticipantRole;
}>;

/** A single vote cast by a participant (rank 1 = highest priority) */
export type Vote = Readonly<{
  voterId: UserId;
  voteeId: UserId;
  rank: VotePriority;
}>;

/** Complete domain input to the k-partition 2-opt algorithm */
export type VoteSet = Readonly<{
  /** presenter / presentee 双方を含む。アルゴリズム内で role === 'presentee' にフィルタして使用 */
  participants: ReadonlyArray<Participant>;
  votes: ReadonlyArray<Vote>;
  policy: SeatPolicy;
}>;

/** A single table in the matching result */
export type TableAssignment = Readonly<{
  id: TableId;
  members: ReadonlyArray<UserId>;
  seatCount: 3 | 4 | 5;
  /** 4人卓かつ female 2 / male 2 のとき true */
  is22: boolean;
  /** 同性のみ卓でなければ true */
  isMixed: boolean;
  /** rank1=3, rank2=2, rank3=1 で双方向の rank 合計 */
  mutualRankScore: number;
}>;

/** Full matching result: assigned tables and any unassigned participants */
export type TableAssignmentPlan = Readonly<{
  tables: ReadonlyArray<TableAssignment>;
  /** Always empty in a valid result. Non-empty signals a hard-constraint violation (e.g., participant count cannot fill tables evenly). */
  leftovers: ReadonlyArray<UserId>;
  score: number;
}>;
