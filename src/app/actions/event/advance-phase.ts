'use server';

import { z } from 'zod';
import type { ActionResult } from '@/shared/types/action-result';
import type { EventPhase } from '@/domain/event/value-objects/event-phase.vo';
import { EventPhaseSchema } from '@/domain/event/value-objects/event-phase.vo';
import { AdvanceEventPhase } from '@/application/event/use-cases/AdvanceEventPhase';
import { SupabaseEventRepository } from '@/infrastructure/supabase/repositories/supabase-event.repository';
import { SupabasePhasePublisher } from '@/infrastructure/realtime/phase-publisher.adapter';
import type { MatchingTriggerPort } from '@/application/event/ports/matching-trigger.port';
import { ok } from '@/domain/shared/types/result';
import { toActionResult } from '@/shared/utils/error';
import { createSupabaseServerClient } from '@/infrastructure/supabase/client-server';
import { asEventId, asUserId } from '@/shared/types/ids';

const schema = z.object({
  eventId: z.string().uuid(),
  nextPhase: EventPhaseSchema,
  round: z.number().int().min(1),
});

// TODO(D): replace with real ComputeMatchingTrigger after #matching is implemented
const noopMatchingTrigger: MatchingTriggerPort = {
  trigger: async () => ok(undefined),
};

export async function advancePhaseAction(
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

  const { data: userRecord, error: userRecordError } = await supabase
    .from('users')
    .select('is_admin')
    .eq('id', user.id)
    .single();

  if (userRecordError) {
    return { ok: false, code: 'internal_error', message: '管理者権限の確認に失敗しました' };
  }

  const useCase = new AdvanceEventPhase(
    new SupabaseEventRepository(),
    new SupabasePhasePublisher(),
    noopMatchingTrigger,
  );

  const result = await useCase.execute({
    eventId: asEventId(parsed.data.eventId),
    nextPhase: parsed.data.nextPhase,
    round: parsed.data.round,
    requesterId: asUserId(user.id),
    isAdmin: userRecord?.is_admin ?? false,
  });

  if (!result.ok) return toActionResult(result.error);
  return { ok: true, data: result.value };
}
