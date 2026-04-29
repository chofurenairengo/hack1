'use server';

import { z } from 'zod';
import type { ActionResult } from '@/shared/types/action-result';
import type { EventPhase } from '@/domain/event/value-objects/event-phase.vo';
import { EventPhaseSchema } from '@/domain/event/value-objects/event-phase.vo';
import { SupabasePhasePublisher } from '@/infrastructure/realtime/phase-publisher.adapter';
import { createSupabaseServerClient } from '@/infrastructure/supabase/client-server';
import { createSupabaseAdminClient } from '@/infrastructure/supabase/client-admin';
import { asEventId } from '@/shared/types/ids';

const schema = z.object({
  eventId: z.string().uuid(),
});

const rewindSchema = z.object({
  eventId: z.string().uuid(),
  currentPhase: EventPhaseSchema,
  round: z.number().int().min(1),
});

const PREVIOUS_PHASE: Readonly<Record<EventPhase, EventPhase | null>> = {
  pre_event: null,
  entry: 'pre_event',
  presentation: 'entry',
  voting: 'presentation',
  intermission: 'voting',
  mingling: 'intermission',
  closing: 'mingling',
};

async function ensureAdmin(): Promise<ActionResult<{ isAdmin: true }>> {
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

  if (userRecordError || !userRecord?.is_admin) {
    return { ok: false, code: 'forbidden', message: '管理者権限が必要です' };
  }

  return { ok: true, data: { isAdmin: true } };
}

async function forceSetPhase(
  eventId: string,
  phase: EventPhase,
  round: number,
): Promise<ActionResult<{ phase: EventPhase; round: number }>> {
  const adminClient = createSupabaseAdminClient();
  const { error: updateError } = await adminClient
    .from('events')
    .update({ phase, updated_at: new Date().toISOString() })
    .eq('id', eventId);

  if (updateError) {
    return { ok: false, code: 'internal_error', message: 'フェーズ更新に失敗しました' };
  }

  const published = await new SupabasePhasePublisher().publish(
    asEventId(eventId),
    phase,
    round,
    new Date().toISOString(),
  );

  if (!published.ok) {
    return { ok: false, code: 'internal_error', message: 'Broadcast の再送に失敗しました' };
  }

  return { ok: true, data: { phase, round } };
}

export async function resetPhaseAction(
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

  const { eventId } = parsed.data;

  const auth = await ensureAdmin();
  if (!auth.ok) return auth;

  return forceSetPhase(eventId, 'pre_event', 1);
}

export async function rewindPhaseAction(
  input: unknown,
): Promise<ActionResult<{ phase: EventPhase; round: number }>> {
  const parsed = rewindSchema.safeParse(input);
  if (!parsed.success) {
    return {
      ok: false,
      code: 'validation_error',
      message: parsed.error.issues[0]?.message ?? '入力内容を確認してください',
    };
  }

  const previousPhase = PREVIOUS_PHASE[parsed.data.currentPhase];
  if (!previousPhase) {
    return {
      ok: false,
      code: 'validation_error',
      message: 'これ以上前のフェーズには戻せません',
    };
  }

  const auth = await ensureAdmin();
  if (!auth.ok) return auth;

  return forceSetPhase(parsed.data.eventId, previousPhase, parsed.data.round);
}
