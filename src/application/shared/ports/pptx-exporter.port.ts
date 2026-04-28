import type { Result } from '@/domain/shared/types/result';
import type { SlideDeck } from '@/domain/slide/entities/slide-deck.entity';

export type PptxExportError = Readonly<{
  code: 'export_failed' | 'invalid_deck';
  message: string;
}>;

export interface PptxExporterPort {
  export(deck: SlideDeck): Promise<Result<Uint8Array, PptxExportError>>;
}
