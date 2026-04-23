import type { EventId, UserId } from '@/shared/types/ids';
import type { VotePriority } from '@/domain/matching/value-objects/vote-priority.vo';
import type { Gender } from '@/domain/user/value-objects/gender.vo';
import type { TableAssignmentPlan } from '@/domain/matching/value-objects/table-assignment.plan';
import type { Result } from '@/domain/shared/types/result';
import type { ValidationError } from '@/domain/shared/errors/validation.error';

export type VoteInput = Readonly<{
  voterUserId: UserId;
  voteeUserId: UserId;
  priority: VotePriority;
}>;

export type ParticipantInput = Readonly<{
  userId: UserId;
  gender: Gender;
  presenterPairId: string | null;
}>;

export type MatchingInput = Readonly<{
  eventId: EventId;
  participants: readonly ParticipantInput[];
  votes: readonly VoteInput[];
  seed: number;
  tableCount: number;
}>;

export interface KPartition2OptService {
  compute(input: MatchingInput): Result<TableAssignmentPlan, ValidationError>;
}
