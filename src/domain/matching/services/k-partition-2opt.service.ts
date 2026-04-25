import type { EventId } from '@/shared/types/ids';
import type { VoteSet, TableAssignmentPlan, Result } from '@/domain/matching/types';
import type { ValidationError } from '@/domain/shared/errors/validation.error';

export type MatchingInput = Readonly<{
  eventId: EventId;
  voteSet: VoteSet;
  seed: number;
}>;

export interface KPartition2OptService {
  compute(input: MatchingInput): Result<TableAssignmentPlan, ValidationError>;
}
