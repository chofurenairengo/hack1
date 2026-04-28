'use server';

import { z } from 'zod';
import type { ActionResult } from '@/shared/types/action-result';
import type { EventPhase } from '@/domain/event/value-objects/event-phase.vo';
import { StartNextRound } from '@/application/event/use-cases/StartNextRound';
import { SupabaseEventRepository } from '@/infrastructure/supabase/repositories/supabase-event.repository';
import { SupabasePhasePublisher } from '@/infrastructure/realtime/phase-publisher.adapter';
import { toActionResult } from '@/shared/utils/error';
import { createSupabaseServerClient } from '@/infrastructure/supabase/client-server';
import { asEventId, asUserId } from '@/shared/types/ids';

const schema = z.object({
  eventId: z.string().uuid(),
  nextPhase: z.enum(['entry', 'presentation']),
  nextRound: z.number().int().min(2),
});

export async function startNextRoundAction(
  input: unknown,
): Promise<ActionResult<{ phase: EventPhase; round: number }>> {
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

  const useCase = new StartNextRound(new SupabaseEventRepository(), new SupabasePhasePublisher());

  const result = await useCase.execute({
    eventId: asEventId(parsed.data.eventId),
    nextPhase: parsed.data.nextPhase,
    nextRound: parsed.data.nextRound,
    requesterId: asUserId(user.id),
  });

  if (!result.ok) return toActionResult(result.error);
  return { ok: true, data: result.value };
}
