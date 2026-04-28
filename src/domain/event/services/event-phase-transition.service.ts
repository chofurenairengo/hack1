import type { EventPhase } from '../value-objects/event-phase.vo';
import type { Result } from '@/domain/shared/types/result';
import { ok, err } from '@/domain/shared/types/result';
import { ALLOWED_TRANSITIONS } from '../value-objects/phase-transition.vo';
import { InvalidTransitionError } from '../errors/invalid-transition.error';

export const EventPhaseTransitionService = {
  canTransition(from: EventPhase, to: EventPhase): Result<void, InvalidTransitionError> {
    if (ALLOWED_TRANSITIONS[from].includes(to)) return ok(undefined);
    return err(new InvalidTransitionError(from, to));
  },

  allowedNextPhases(from: EventPhase): readonly EventPhase[] {
    return ALLOWED_TRANSITIONS[from];
  },
};
