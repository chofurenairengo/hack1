import type { EventId, UserId } from '@/shared/types/ids';
import type { EventPhase } from '@/domain/event/value-objects/event-phase.vo';
import type { EventRepository } from '@/domain/event/repositories/event.repository';
import type { PhasePublisherPort } from '../ports/phase-publisher.port';
import type { MatchingTriggerPort } from '../ports/matching-trigger.port';
import type { Result } from '@/domain/shared/types/result';
import type { NotFoundError } from '@/domain/shared/errors/not-found.error';
import type { ForbiddenError } from '@/domain/shared/errors/forbidden.error';
import type { InvalidTransitionError } from '@/domain/event/errors/invalid-transition.error';
import { Event } from '@/domain/event/entities/event.entity';
import { ok, err } from '@/domain/shared/types/result';
import { ForbiddenError as ForbiddenErr } from '@/domain/shared/errors/forbidden.error';

export type AdvanceEventPhaseInput = Readonly<{
  eventId: EventId;
  nextPhase: EventPhase;
  round: number;
  requesterId: UserId;
  isAdmin: boolean;
}>;

export type AdvanceEventPhaseOutput = Readonly<{
  phase: EventPhase;
  round: number;
}>;

export type AdvanceEventPhaseError =
  | NotFoundError
  | ForbiddenError
  | InvalidTransitionError
  | Error;

export class AdvanceEventPhase {
  constructor(
    private readonly eventRepo: EventRepository,
    private readonly phasePublisher: PhasePublisherPort,
    private readonly matchingTrigger: MatchingTriggerPort,
  ) {}

  async execute(
    input: AdvanceEventPhaseInput,
  ): Promise<Result<AdvanceEventPhaseOutput, AdvanceEventPhaseError>> {
    const found = await this.eventRepo.findById(input.eventId);
    if (!found.ok) return found;

    const record = found.value;
    if (record.organizerId !== input.requesterId && !input.isAdmin) {
      return err(new ForbiddenErr('イベントを進行できるのはオーガナイザーまたは管理者のみです'));
    }

    // Skip DB update if already at nextPhase — allows publish retry after partial failure
    if (record.phase !== input.nextPhase) {
      const event = Event.create({
        id: record.id,
        currentPhase: record.phase,
        status: 'live',
        currentRound: input.round,
      });
      const transition = event.transitionTo(input.nextPhase);
      if (!transition.ok) return transition;

      const updated = await this.eventRepo.updatePhase(input.eventId, input.nextPhase);
      if (!updated.ok) return updated;
    }

    const published = await this.phasePublisher.publish(
      input.eventId,
      input.nextPhase,
      input.round,
      new Date().toISOString(),
    );
    if (!published.ok) return published;

    if (input.nextPhase === 'intermission') {
      const triggered = await this.matchingTrigger.trigger(input.eventId);
      if (!triggered.ok) return triggered;
    }

    return ok({ phase: input.nextPhase, round: input.round });
  }
}
