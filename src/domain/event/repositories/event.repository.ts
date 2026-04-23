import type { EventId, UserId } from '@/shared/types/ids';
import type { EventPhase } from '@/domain/event/value-objects/event-phase.vo';
import type { Result } from '@/domain/shared/types/result';
import type { NotFoundError } from '@/domain/shared/errors/not-found.error';
import type { ForbiddenError } from '@/domain/shared/errors/forbidden.error';

export type EventRecord = Readonly<{
  id: EventId;
  title: string;
  description: string | null;
  mode: 'online' | 'offline';
  phase: EventPhase;
  venue: string | null;
  scheduledAt: Date | null;
  organizerId: UserId;
  maxParticipants: number | null;
  createdAt: Date;
  updatedAt: Date;
}>;

export type CreateEventInput = Readonly<{
  title: string;
  description?: string;
  mode: 'online' | 'offline';
  venue?: string;
  scheduledAt?: Date;
  organizerId: UserId;
  maxParticipants?: number;
}>;

export interface EventRepository {
  findById(id: EventId): Promise<Result<EventRecord, NotFoundError>>;
  findAll(): Promise<Result<readonly EventRecord[], never>>;
  create(input: CreateEventInput): Promise<Result<EventRecord, never>>;
  updatePhase(
    id: EventId,
    phase: EventPhase,
  ): Promise<Result<EventRecord, NotFoundError | ForbiddenError>>;
}
