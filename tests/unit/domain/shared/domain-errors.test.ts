import { describe, it, expect } from 'vitest';
import { NotFoundError } from '@/domain/shared/errors/not-found.error';
import { ForbiddenError } from '@/domain/shared/errors/forbidden.error';
import { ValidationError } from '@/domain/shared/errors/validation.error';
import { ConflictError } from '@/domain/shared/errors/conflict.error';

describe('DomainError subclasses', () => {
  it('NotFoundError has correct code and is an Error', () => {
    const e = new NotFoundError('User not found');
    expect(e.code).toBe('not_found');
    expect(e.message).toBe('User not found');
    expect(e instanceof Error).toBe(true);
  });

  it('ForbiddenError has correct code', () => {
    const e = new ForbiddenError('Access denied');
    expect(e.code).toBe('forbidden');
  });

  it('ValidationError carries details', () => {
    const details = { field: 'email', issue: 'invalid' };
    const e = new ValidationError('Validation failed', details);
    expect(e.code).toBe('validation_error');
    expect(e.details).toEqual(details);
  });

  it('ConflictError has correct code', () => {
    const e = new ConflictError('Already exists');
    expect(e.code).toBe('conflict');
  });
});
