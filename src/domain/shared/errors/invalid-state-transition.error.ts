import { DomainError } from './domain-error';

export class InvalidStateTransitionError extends DomainError {
  readonly code = 'invalid_state_transition' as const;

  constructor(
    public readonly from: string,
    public readonly to: string,
  ) {
    super(`Invalid state transition: ${from} → ${to}`);
  }
}
