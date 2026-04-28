'use server';

import { z } from 'zod';
import type { ActionResult } from '@/shared/types/action-result';
import type { EventPhase } from '@/domain/event/value-objects/event-phase.vo';
import { ListActivePhase } from '@/application/event/use-cases/ListActivePhase';
import { SupabaseEventRepository } from '@/infrastructure/supabase/repositories/supabase-event.repository';
import { toActionResult } from '@/shared/utils/error';
import { createSupabaseServerClient } from '@/infrastructure/supabase/client-server';
import { asEventId } from '@/shared/types/ids';

const schema = z.object({
  eventId: z.string().uuid(),
});

export async function getActivePhaseAction(
  input: unknown,
): Promise<ActionResult<{ phase: EventPhase }>> {
  const parsed = schema.safeParse(input);
  if (!parsed.success) {
    return {
      ok: false,
      code: 'validation_error',
      message: parsed.error.issues[0]?.message ?? '入力内容を確認してください',
    };
  }

  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { ok: false, code: 'unauthenticated', message: '認証が必要です' };
  }

  const useCase = new ListActivePhase(new SupabaseEventRepository());

  const result = await useCase.execute({
    eventId: asEventId(parsed.data.eventId),
  });

  if (!result.ok) return toActionResult(result.error);
  return { ok: true, data: result.value };
}
