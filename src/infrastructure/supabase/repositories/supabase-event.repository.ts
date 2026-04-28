import 'server-only';
import type {
  EventRepository,
  EventRecord,
  CreateEventInput,
} from '@/domain/event/repositories/event.repository';
import type { EventId } from '@/shared/types/ids';
import type { EventPhase } from '@/domain/event/value-objects/event-phase.vo';
import type { Result } from '@/domain/shared/types/result';
import type { NotFoundError } from '@/domain/shared/errors/not-found.error';
import type { ForbiddenError } from '@/domain/shared/errors/forbidden.error';
import { ok, err } from '@/domain/shared/types/result';
import { NotFoundError as NotFoundErr } from '@/domain/shared/errors/not-found.error';
import { ForbiddenError as ForbiddenErr } from '@/domain/shared/errors/forbidden.error';
import { createSupabaseServerClient } from '../client-server';
import type { Database } from '@/types/supabase';
import { asEventId, asUserId } from '@/shared/types/ids';

type EventRow = Database['public']['Tables']['events']['Row'];

function toEventRecord(row: EventRow): EventRecord {
  return {
    id: asEventId(row.id),
    title: row.title,
    description: row.description,
    mode: row.mode as 'online' | 'offline',
    phase: row.phase as EventPhase,
    venue: row.venue,
    scheduledAt: row.scheduled_at ? new Date(row.scheduled_at) : null,
    organizerId: asUserId(row.organizer_id),
    maxParticipants: row.max_participants,
    createdAt: new Date(row.created_at),
    updatedAt: new Date(row.updated_at),
  };
}

export class SupabaseEventRepository implements EventRepository {
  async findById(id: EventId): Promise<Result<EventRecord, NotFoundError>> {
    const supabase = await createSupabaseServerClient();
    const { data, error } = await supabase.from('events').select('*').eq('id', id).single();

    if (error || !data) {
      return err(new NotFoundErr(`イベント ${id} が見つかりません`));
    }

    return ok(toEventRecord(data));
  }

  async findAll(): Promise<Result<readonly EventRecord[], never>> {
    const supabase = await createSupabaseServerClient();
    const { data } = await supabase
      .from('events')
      .select('*')
      .order('created_at', { ascending: false });

    return ok((data ?? []).map(toEventRecord));
  }

  async create(input: CreateEventInput): Promise<Result<EventRecord, never>> {
    const supabase = await createSupabaseServerClient();
    const { data } = await supabase
      .from('events')
      .insert({
        title: input.title,
        description: input.description ?? null,
        mode: input.mode,
        venue: input.venue ?? null,
        scheduled_at: input.scheduledAt?.toISOString() ?? null,
        organizer_id: input.organizerId,
        max_participants: input.maxParticipants ?? null,
      })
      .select('*')
      .single()
      .throwOnError();

    return ok(toEventRecord(data!));
  }

  async updatePhase(
    id: EventId,
    phase: EventPhase,
  ): Promise<Result<EventRecord, NotFoundError | ForbiddenError>> {
    const supabase = await createSupabaseServerClient();
    const { data, error } = await supabase
      .from('events')
      .update({ phase, updated_at: new Date().toISOString() })
      .eq('id', id)
      .select('*')
      .single();

    if (error || !data) {
      if (error?.code === '42501') {
        return err(new ForbiddenErr(`イベント ${id} を更新する権限がありません`));
      }
      return err(new NotFoundErr(`イベント ${id} が見つかりません`));
    }

    return ok(toEventRecord(data));
  }
}
