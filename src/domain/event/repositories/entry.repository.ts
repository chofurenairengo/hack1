import type { EventId, UserId } from '@/shared/types/ids';
import type { EntryType } from '@/domain/event/value-objects/entry-type.vo';
import type { Result } from '@/domain/shared/types/result';
import type { NotFoundError } from '@/domain/shared/errors/not-found.error';
import type { ConflictError } from '@/domain/shared/errors/conflict.error';

export type EntryRecord = Readonly<{
  id: string;
  eventId: EventId;
  userId: UserId;
  entryType: EntryType;
  pairId: string | null;
  isPresenter: boolean;
  ngRequested: boolean;
  createdAt: Date;
}>;

export type CreateEntryInput = Readonly<{
  eventId: EventId;
  userId: UserId;
  entryType: EntryType;
}>;

export interface EntryRepository {
  findByEvent(eventId: EventId): Promise<Result<readonly EntryRecord[], never>>;
  findByUser(userId: UserId, eventId: EventId): Promise<Result<EntryRecord, NotFoundError>>;
  create(input: CreateEntryInput): Promise<Result<EntryRecord, ConflictError>>;
  updateNgRequested(
    userId: UserId,
    eventId: EventId,
    ngRequested: boolean,
  ): Promise<Result<EntryRecord, NotFoundError>>;
}
