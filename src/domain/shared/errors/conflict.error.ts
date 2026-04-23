import { DomainError } from './domain-error';

export class ConflictError extends DomainError {
  readonly code = 'conflict' as const;

  constructor(message: string) {
    super(message);
  }
}
