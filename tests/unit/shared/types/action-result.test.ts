import { describe, it, expect } from 'vitest';
import type { ActionResult } from '@/shared/types/action-result';

describe('ActionResult type', () => {
  it('ok result has ok=true and data', () => {
    const result: ActionResult<number> = { ok: true, data: 42 };
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.data).toBe(42);
    }
  });

  it('error result has ok=false, code, and message', () => {
    const result: ActionResult<never> = {
      ok: false,
      code: 'not_found',
      message: 'Resource not found',
    };
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.code).toBe('not_found');
      expect(result.message).toBe('Resource not found');
    }
  });
});
