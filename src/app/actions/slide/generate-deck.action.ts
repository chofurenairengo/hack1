'use server';

import { z } from 'zod';
import type { ActionResult } from '@/shared/types/action-result';
import { generateSlideDeckUseCase } from '@/application/slide/use-cases/generate-slide-deck.use-case';
import { SupabaseSlideDeckRepository } from '@/infrastructure/supabase/repositories/slide-deck.repository';
import { GeminiSlideGenerator } from '@/infrastructure/ai/gemini/gemini-slide-generator';
import type { DeckId } from '@/shared/types/ids';
import { asDeckId, asPairId, asEventId } from '@/shared/types/ids';
import { createSupabaseServerClient } from '@/infrastructure/supabase/client-server';

const schema = z.object({
  pairId: z.string().uuid(),
  eventId: z.string().uuid(),
  existingDeckId: z.string().uuid().optional(),
  presenterName: z.string().min(1).max(50),
  introduceeHobbies: z.string().min(1).max(200),
  introduceeEpisode: z.string().min(20).max(500),
});

export async function generateDeckAction(
  input: unknown,
): Promise<ActionResult<{ deckId: DeckId }>> {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, code: 'unauthenticated', message: '認証が必要です' };

  const parsed = schema.safeParse(input);
  if (!parsed.success) {
    return {
      ok: false,
      code: 'validation_error',
      message: '入力内容を確認してください',
      details: parsed.error.flatten(),
    };
  }

  const result = await generateSlideDeckUseCase(
    {
      pairId: asPairId(parsed.data.pairId),
      eventId: asEventId(parsed.data.eventId),
      existingDeckId: parsed.data.existingDeckId ? asDeckId(parsed.data.existingDeckId) : undefined,
      presenterName: parsed.data.presenterName,
      introduceeHobbies: parsed.data.introduceeHobbies
        .split(',')
        .map((s) => s.trim())
        .filter(Boolean),
      introduceeEpisode: parsed.data.introduceeEpisode,
    },
    {
      repository: new SupabaseSlideDeckRepository(),
      aiGenerator: new GeminiSlideGenerator(),
    },
  );

  if (!result.ok) {
    if (result.error.code === 'ai_blocked') {
      return { ok: false, code: 'forbidden', message: result.error.reason ?? result.error.message };
    }
    if (result.error.code === 'not_found') {
      return { ok: false, code: 'not_found', message: result.error.message };
    }
    return { ok: false, code: 'internal_error', message: 'スライドの生成に失敗しました' };
  }

  return { ok: true, data: { deckId: result.value.id } };
}
