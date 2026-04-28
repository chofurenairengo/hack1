import { DomainError } from '@/domain/shared/errors/domain-error';
import type { EventPhase } from '../value-objects/event-phase.vo';

export class InvalidTransitionError extends DomainError {
  readonly code = 'invalid_transition' as const;

  constructor(
    public readonly from: EventPhase,
    public readonly to: EventPhase,
  ) {
    super(`Cannot transition from '${from}' to '${to}'`);
  }
}
