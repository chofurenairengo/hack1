import type { Result } from '@/domain/shared/types/result';

export type SlideGenerationInput = Readonly<{
  presenterName: string;
  introduceeHobbies: readonly string[];
  introduceeEpisode: string;
  seed?: number;
}>;

export type GeneratedSlide = Readonly<{
  slideIndex: number;
  title: string;
  body: string;
  presenterScript: string;
  layoutHint: Readonly<{
    icon: string;
    colorPalette: string;
    accentEmoji: string;
  }>;
}>;

export type SlideGenerationResult = Readonly<{
  slides: readonly GeneratedSlide[];
  blocked: boolean;
  reason: string | null;
}>;

export type AIGeneratorError = Readonly<{
  code: 'ai_blocked' | 'parse_error' | 'quota_exceeded' | 'unknown';
  message: string;
  reason?: string;
}>;

export interface AIGeneratorPort {
  generateSlides(
    input: SlideGenerationInput,
  ): Promise<Result<SlideGenerationResult, AIGeneratorError>>;
}
