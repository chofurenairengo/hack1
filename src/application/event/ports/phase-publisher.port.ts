import type { EventId } from '@/shared/types/ids';
import type { EventPhase } from '@/domain/event/value-objects/event-phase.vo';
import type { Result } from '@/domain/shared/types/result';

export interface PhasePublisherPort {
  publish(
    eventId: EventId,
    phase: EventPhase,
    round: number,
    startedAt: string,
  ): Promise<Result<void, Error>>;
}
