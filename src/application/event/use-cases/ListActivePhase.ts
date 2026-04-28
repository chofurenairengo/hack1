import type { EventId } from '@/shared/types/ids';
import type { EventPhase } from '@/domain/event/value-objects/event-phase.vo';
import type { EventRepository } from '@/domain/event/repositories/event.repository';
import type { Result } from '@/domain/shared/types/result';
import type { NotFoundError } from '@/domain/shared/errors/not-found.error';

export type ListActivePhaseInput = Readonly<{
  eventId: EventId;
}>;

export type ListActivePhaseOutput = Readonly<{
  phase: EventPhase;
}>;

export class ListActivePhase {
  constructor(private readonly eventRepo: EventRepository) {}

  async execute(
    input: ListActivePhaseInput,
  ): Promise<Result<ListActivePhaseOutput, NotFoundError>> {
    const found = await this.eventRepo.findById(input.eventId);
    if (!found.ok) return found;

    return { ok: true, value: { phase: found.value.phase } };
  }
}
