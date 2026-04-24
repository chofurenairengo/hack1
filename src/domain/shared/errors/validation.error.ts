import { DomainError } from './domain-error';

export class ValidationError extends DomainError {
  readonly code = 'validation_error' as const;

  constructor(
    message: string,
    public readonly details: unknown,
  ) {
    super(message);
  }
}
