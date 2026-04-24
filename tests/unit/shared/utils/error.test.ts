import { describe, it, expect } from 'vitest';
import { toActionResult } from '@/shared/utils/error';
import { NotFoundError } from '@/domain/shared/errors/not-found.error';
import { ForbiddenError } from '@/domain/shared/errors/forbidden.error';
import { ValidationError } from '@/domain/shared/errors/validation.error';
import { ConflictError } from '@/domain/shared/errors/conflict.error';

describe('toActionResult', () => {
  it('maps NotFoundError to not_found code', () => {
    const result = toActionResult(new NotFoundError('not found'));
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.code).toBe('not_found');
  });

  it('maps ForbiddenError to forbidden code', () => {
    const result = toActionResult(new ForbiddenError('denied'));
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.code).toBe('forbidden');
  });

  it('maps ValidationError to validation_error code', () => {
    const result = toActionResult(new ValidationError('invalid', { field: 'x' }));
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.code).toBe('validation_error');
  });

  it('maps ConflictError to conflict code', () => {
    const result = toActionResult(new ConflictError('conflict'));
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.code).toBe('conflict');
  });

  it('maps unknown error to internal_error code', () => {
    const result = toActionResult(new Error('unexpected'));
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.code).toBe('internal_error');
  });

  it('maps non-Error to internal_error code', () => {
    const result = toActionResult('something went wrong');
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.code).toBe('internal_error');
  });
});
