'use server';

import { z } from 'zod';
import type { ActionResult } from '@/shared/types/action-result';
import { approveByOrganizerUseCase } from '@/application/slide/use-cases/approve-by-organizer.use-case';
import { SupabaseSlideDeckRepository } from '@/infrastructure/supabase/repositories/slide-deck.repository';
import { asDeckId } from '@/shared/types/ids';
import type { DeckId } from '@/shared/types/ids';
import { createSupabaseServerClient } from '@/infrastructure/supabase/client-server';
import { createSupabaseAdminClient } from '@/infrastructure/supabase/client-admin';

const schema = z.object({ deckId: z.string().uuid() });

export async function approveByOrganizerAction(
  input: unknown,
): Promise<ActionResult<{ deckId: DeckId }>> {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, code: 'unauthenticated', message: '認証が必要です' };

  const { data: profile } = await supabase
    .from('users')
    .select('is_admin')
    .eq('id', user.id)
    .single();
  if (!profile?.is_admin) {
    return { ok: false, code: 'forbidden', message: '管理者権限が必要です' };
  }

  const parsed = schema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, code: 'validation_error', message: '入力内容を確認してください' };
  }

  const result = await approveByOrganizerUseCase(asDeckId(parsed.data.deckId), {
    repository: new SupabaseSlideDeckRepository(createSupabaseAdminClient()),
  });

  if (!result.ok) {
    if (result.error.code === 'not_found') {
      return { ok: false, code: 'not_found', message: result.error.message };
    }
    if (result.error.code === 'update_failed') {
      return { ok: false, code: 'internal_error', message: result.error.message };
    }
    return { ok: false, code: 'forbidden', message: result.error.message };
  }

  return { ok: true, data: { deckId: result.value.id } };
}
