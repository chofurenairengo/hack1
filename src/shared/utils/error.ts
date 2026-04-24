import type { ActionResult } from '@/shared/types/action-result';
import { DomainError } from '@/domain/shared/errors/domain-error';
import { NotFoundError } from '@/domain/shared/errors/not-found.error';
import { ForbiddenError } from '@/domain/shared/errors/forbidden.error';
import { ValidationError } from '@/domain/shared/errors/validation.error';
import { ConflictError } from '@/domain/shared/errors/conflict.error';

export function toActionResult(error: unknown): ActionResult<never> {
  if (error instanceof ValidationError) {
    return {
      ok: false,
      code: 'validation_error',
      message: error.message,
      details: error.details,
    };
  }
  if (error instanceof NotFoundError) {
    return { ok: false, code: 'not_found', message: error.message };
  }
  if (error instanceof ForbiddenError) {
    return { ok: false, code: 'forbidden', message: error.message };
  }
  if (error instanceof ConflictError) {
    return { ok: false, code: 'conflict', message: error.message };
  }
  if (error instanceof DomainError) {
    return { ok: false, code: 'internal_error', message: error.message };
  }
  return { ok: false, code: 'internal_error', message: '予期しないエラーが発生しました' };
}
