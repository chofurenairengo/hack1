import type { EventId, UserId } from '@/shared/types/ids';
import type { EventRepository } from '@/domain/event/repositories/event.repository';
import type { PhasePublisherPort } from '../ports/phase-publisher.port';
import type { Result } from '@/domain/shared/types/result';
import type { NotFoundError } from '@/domain/shared/errors/not-found.error';
import type { ForbiddenError } from '@/domain/shared/errors/forbidden.error';
import type { InvalidTransitionError } from '@/domain/event/errors/invalid-transition.error';
import type { EventPhase } from '@/domain/event/value-objects/event-phase.vo';
import { Event } from '@/domain/event/entities/event.entity';
import { ok, err } from '@/domain/shared/types/result';
import { ForbiddenError as ForbiddenErr } from '@/domain/shared/errors/forbidden.error';

export type StartNextRoundInput = Readonly<{
  eventId: EventId;
  nextPhase: 'entry' | 'presentation';
  nextRound: number;
  requesterId: UserId;
  isAdmin: boolean;
}>;

export type StartNextRoundOutput = Readonly<{
  phase: EventPhase;
  round: number;
}>;

export type StartNextRoundError = NotFoundError | ForbiddenError | InvalidTransitionError | Error;

export class StartNextRound {
  constructor(
    private readonly eventRepo: EventRepository,
    private readonly phasePublisher: PhasePublisherPort,
  ) {}

  async execute(
    input: StartNextRoundInput,
  ): Promise<Result<StartNextRoundOutput, StartNextRoundError>> {
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
        currentRound: input.nextRound,
      });
      const transition = event.transitionTo(input.nextPhase);
      if (!transition.ok) return transition;

      const updated = await this.eventRepo.updatePhase(input.eventId, input.nextPhase);
      if (!updated.ok) return updated;
    }

    const published = await this.phasePublisher.publish(
      input.eventId,
      input.nextPhase,
      input.nextRound,
      new Date().toISOString(),
    );
    if (!published.ok) return published;

    return ok({ phase: input.nextPhase, round: input.nextRound });
  }
}
