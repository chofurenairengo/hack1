import type { EventId } from '@/shared/types/ids';
import type { EventPhase } from '../value-objects/event-phase.vo';
import type { EventStatus } from '../value-objects/event-status.vo';
import type { Result } from '@/domain/shared/types/result';
import { ok } from '@/domain/shared/types/result';
import { EventPhaseTransitionService } from '../services/event-phase-transition.service';
import { InvalidTransitionError } from '../errors/invalid-transition.error';

export type EventProps = Readonly<{
  id: EventId;
  currentPhase: EventPhase;
  status: EventStatus;
  currentRound: number;
}>;

export class Event {
  private constructor(private readonly props: EventProps) {}

  static create(props: EventProps): Event {
    return new Event(props);
  }

  get id(): EventId {
    return this.props.id;
  }

  get currentPhase(): EventPhase {
    return this.props.currentPhase;
  }

  get status(): EventStatus {
    return this.props.status;
  }

  get currentRound(): number {
    return this.props.currentRound;
  }

  transitionTo(nextPhase: EventPhase): Result<Event, InvalidTransitionError> {
    const check = EventPhaseTransitionService.canTransition(this.props.currentPhase, nextPhase);
    if (!check.ok) return check;
    return ok(new Event({ ...this.props, currentPhase: nextPhase }));
  }
}
