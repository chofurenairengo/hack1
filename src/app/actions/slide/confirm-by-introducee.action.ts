'use server';

import { z } from 'zod';
import type { ActionResult } from '@/shared/types/action-result';
import { confirmByIntroduceeUseCase } from '@/application/slide/use-cases/confirm-by-introducee.use-case';
import { SupabaseSlideDeckRepository } from '@/infrastructure/supabase/repositories/slide-deck.repository';
import { asDeckId } from '@/shared/types/ids';
import type { DeckId } from '@/shared/types/ids';
import { createSupabaseServerClient } from '@/infrastructure/supabase/client-server';

const schema = z.object({
  deckId: z.string().uuid(),
  decision: z.enum(['approve', 'revision']),
});

export async function confirmByIntroduceeAction(
  input: unknown,
): Promise<ActionResult<{ deckId: DeckId }>> {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, code: 'unauthenticated', message: '認証が必要です' };

  const parsed = schema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, code: 'validation_error', message: '入力内容を確認してください' };
  }

  // 呼び出し者が当該デッキの被紹介者本人であることを確認する
  const { data: deck } = await supabase
    .from('slide_decks')
    .select('pair_id')
    .eq('id', parsed.data.deckId)
    .single();
  if (!deck) return { ok: false, code: 'not_found', message: 'スライドが見つかりません' };

  const { data: pair } = await supabase
    .from('presentation_pairs')
    .select('introducee_id')
    .eq('id', deck.pair_id)
    .single();
  if (!pair || pair.introducee_id !== user.id) {
    return { ok: false, code: 'forbidden', message: '被紹介者本人のみ操作できます' };
  }

  const result = await confirmByIntroduceeUseCase(
    { deckId: asDeckId(parsed.data.deckId), decision: parsed.data.decision },
    { repository: new SupabaseSlideDeckRepository() },
  );

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
