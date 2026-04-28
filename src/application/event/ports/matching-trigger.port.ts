import type { EventId } from '@/shared/types/ids';
import type { Result } from '@/domain/shared/types/result';

export interface MatchingTriggerPort {
  trigger(eventId: EventId): Promise<Result<void, Error>>;
}
