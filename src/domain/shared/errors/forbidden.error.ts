import { DomainError } from './domain-error';

export class ForbiddenError extends DomainError {
  readonly code = 'forbidden' as const;

  constructor(message = 'Access denied') {
    super(message);
  }
}
