import { DomainError } from './domain-error';

export class NotFoundError extends DomainError {
  readonly code = 'not_found' as const;

  constructor(message: string) {
    super(message);
  }
}
