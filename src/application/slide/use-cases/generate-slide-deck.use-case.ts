import { ok, err } from '@/domain/shared/types/result';
import type { Result } from '@/domain/shared/types/result';
import type {
  SlideDeckRepository,
  SlideDeckRecord,
} from '@/domain/slide/repositories/slide-deck.repository';
import type {
  AIGeneratorPort,
  SlideGenerationInput,
} from '@/application/shared/ports/ai-generator.port';
import type { PairId, EventId, DeckId } from '@/shared/types/ids';

export type GenerateSlideDeckInput = {
  readonly pairId: PairId;
  readonly eventId: EventId;
  readonly existingDeckId?: DeckId;
} & SlideGenerationInput;

export type GenerateSlideDeckError =
  | { readonly code: 'ai_blocked'; readonly message: string; readonly reason?: string }
  | { readonly code: 'ai_error'; readonly message: string }
  | { readonly code: 'not_found'; readonly message: string };

export type AiGenerationLog = {
  slides: SlideDeckRecord['aiGenerationLog'];
  generatedAt: string;
  seed: number;
};

export async function generateSlideDeckUseCase(
  input: GenerateSlideDeckInput,
  deps: { repository: SlideDeckRepository; aiGenerator: AIGeneratorPort },
): Promise<Result<SlideDeckRecord, GenerateSlideDeckError>> {
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

  const log: AiGenerationLog = {
    slides: aiResult.value.slides as unknown as SlideDeckRecord['aiGenerationLog'],
    generatedAt: new Date().toISOString(),
    seed,
  };

  if (input.existingDeckId) {
    const updateResult = await deps.repository.update(input.existingDeckId, {
      status: 'draft',
      aiGenerationLog: log,
    });
    if (!updateResult.ok) {
      return err({ code: 'not_found', message: updateResult.error.message });
    }
    return ok(updateResult.value);
  }

  const createResult = await deps.repository.create({
    pairId: input.pairId,
    eventId: input.eventId,
  });

  if (!createResult.ok) {
    return err({ code: 'ai_error', message: 'Failed to create deck' });
  }

  const updateResult = await deps.repository.update(createResult.value.id, {
    aiGenerationLog: log,
  });

  if (!updateResult.ok) {
    return err({ code: 'not_found', message: updateResult.error.message });
  }
  return ok(updateResult.value);
}
