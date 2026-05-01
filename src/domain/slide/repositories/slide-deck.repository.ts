import type { DeckId, EventId, PairId } from '@/shared/types/ids';
import type { SlideStatus } from '@/domain/slide/value-objects/slide-status.vo';
import type { Result } from '@/domain/shared/types/result';
import type { NotFoundError } from '@/domain/shared/errors/not-found.error';

export type SlideDeckRecord = Readonly<{
  id: DeckId;
  eventId: EventId;
  pairId: PairId;
  status: SlideStatus;
  aiGenerationLog: unknown | null;
  pptxStoragePath: string | null;
  createdAt: Date;
  updatedAt: Date;
}>;

export type CreateSlideDeckInput = Readonly<{
  eventId: EventId;
  pairId: PairId;
}>;

export type UpdateSlideDeckInput = Readonly<{
  status?: SlideStatus;
  aiGenerationLog?: unknown;
  pptxStoragePath?: string;
}>;

export interface SlideDeckRepository {
  findById(id: DeckId): Promise<Result<SlideDeckRecord, NotFoundError>>;
  findByPair(pairId: PairId): Promise<Result<SlideDeckRecord, NotFoundError>>;
  findByEvent(eventId: EventId): Promise<Result<readonly SlideDeckRecord[], NotFoundError>>;
  create(input: CreateSlideDeckInput): Promise<Result<SlideDeckRecord, NotFoundError>>;
  update(id: DeckId, input: UpdateSlideDeckInput): Promise<Result<SlideDeckRecord, NotFoundError>>;
}
