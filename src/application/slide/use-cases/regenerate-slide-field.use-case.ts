import { ok, err } from '@/domain/shared/types/result';
import type { Result } from '@/domain/shared/types/result';
import type {
  SlideDeckRepository,
  SlideDeckRecord,
} from '@/domain/slide/repositories/slide-deck.repository';
import type { AIGeneratorPort } from '@/application/shared/ports/ai-generator.port';
import type { DeckId } from '@/shared/types/ids';
import type { SlideField } from '@/domain/slide/entities/slide.entity';
import type { AiGenerationLog } from './generate-slide-deck.use-case';

export type RegenerateSlideFieldInput = Readonly<{
  deckId: DeckId;
  slideIndex: 0 | 1 | 2 | 3 | 4;
  field: SlideField;
  presenterName: string;
  introduceeHobbies: readonly string[];
  introduceeEpisode: string;
}>;

export type RegenerateSlideFieldError =
  | { readonly code: 'not_found'; readonly message: string }
  | { readonly code: 'invalid_status'; readonly message: string }
  | { readonly code: 'no_content'; readonly message: string }
  | { readonly code: 'ai_blocked'; readonly message: string; readonly reason?: string }
  | { readonly code: 'ai_error'; readonly message: string };

export async function regenerateSlideFieldUseCase(
  input: RegenerateSlideFieldInput,
  deps: { repository: SlideDeckRepository; aiGenerator: AIGeneratorPort },
): Promise<Result<SlideDeckRecord, RegenerateSlideFieldError>> {
  const findResult = await deps.repository.findById(input.deckId);
  if (!findResult.ok) {
    return err({ code: 'not_found', message: findResult.error.message });
  }

  const deck = findResult.value;
  if (deck.status !== 'draft') {
    return err({
      code: 'invalid_status',
      message: `Cannot regenerate field for deck in status "${deck.status}". Expected "draft".`,
    });
  }

  const log = deck.aiGenerationLog as AiGenerationLog | null;
  if (!log || !Array.isArray(log.slides)) {
    return err({ code: 'no_content', message: 'Deck has no AI-generated content to regenerate.' });
  }

  const seed = Math.floor(Math.random() * 100000);
  const aiResult = await deps.aiGenerator.generateSlides({
    presenterName: input.presenterName,
    introduceeHobbies: input.introduceeHobbies,
    introduceeEpisode: input.introduceeEpisode,
    seed,
  });

  if (!aiResult.ok) {
    const { code, message } = aiResult.error;
    if (code === 'ai_blocked') {
      return err({ code: 'ai_blocked', message, reason: aiResult.error.reason });
    }
    return err({ code: 'ai_error', message });
  }

  const regeneratedSlide = aiResult.value.slides[input.slideIndex];
  if (!regeneratedSlide) {
    return err({ code: 'ai_error', message: 'AI did not return the requested slide index.' });
  }

  const updatedSlides = log.slides.map((slide, i) =>
    i === input.slideIndex ? { ...slide, [input.field]: regeneratedSlide[input.field] } : slide,
  );

  const updateResult = await deps.repository.update(input.deckId, {
    aiGenerationLog: { ...log, slides: updatedSlides, generatedAt: new Date().toISOString(), seed },
  });

  if (!updateResult.ok) {
    return err({ code: 'not_found', message: updateResult.error.message });
  }
  return ok(updateResult.value);
}
