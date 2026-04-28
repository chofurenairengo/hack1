import { ok, err } from '@/domain/shared/types/result';
import type { Result } from '@/domain/shared/types/result';
import type {
  SlideDeckRepository,
  SlideDeckRecord,
} from '@/domain/slide/repositories/slide-deck.repository';
import type { DeckId } from '@/shared/types/ids';
import type { SlideField } from '@/domain/slide/entities/slide.entity';
import type { AiGenerationLog } from './generate-slide-deck.use-case';

export type UpdateSlideFieldInput = Readonly<{
  deckId: DeckId;
  slideIndex: 0 | 1 | 2 | 3 | 4;
  field: SlideField;
  value: string;
}>;

export type UpdateSlideFieldError =
  | { readonly code: 'not_found'; readonly message: string }
  | { readonly code: 'invalid_status'; readonly message: string }
  | { readonly code: 'no_content'; readonly message: string };

export async function updateSlideFieldUseCase(
  input: UpdateSlideFieldInput,
  deps: { repository: SlideDeckRepository },
): Promise<Result<SlideDeckRecord, UpdateSlideFieldError>> {
  const findResult = await deps.repository.findById(input.deckId);
  if (!findResult.ok) {
    return err({ code: 'not_found', message: findResult.error.message });
  }

  const deck = findResult.value;
  if (deck.status !== 'draft') {
    return err({
      code: 'invalid_status',
      message: `Cannot edit deck in status "${deck.status}". Expected "draft".`,
    });
  }

  const log = deck.aiGenerationLog as AiGenerationLog | null;
  if (!log || !Array.isArray(log.slides)) {
    return err({ code: 'no_content', message: 'Deck has no AI-generated content to update.' });
  }

  const updatedSlides = log.slides.map((slide, i) =>
    i === input.slideIndex ? { ...slide, [input.field]: input.value } : slide,
  );

  const updateResult = await deps.repository.update(input.deckId, {
    aiGenerationLog: { ...log, slides: updatedSlides },
  });

  if (!updateResult.ok) {
    return err({ code: 'not_found', message: updateResult.error.message });
  }
  return ok(updateResult.value);
}
