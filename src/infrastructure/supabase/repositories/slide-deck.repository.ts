import type {
  SlideDeckRepository,
  SlideDeckRecord,
  CreateSlideDeckInput,
  UpdateSlideDeckInput,
} from '@/domain/slide/repositories/slide-deck.repository';
import { ok, err } from '@/domain/shared/types/result';
import type { Result } from '@/domain/shared/types/result';
import { NotFoundError } from '@/domain/shared/errors/not-found.error';
import type { DeckId, PairId, EventId } from '@/shared/types/ids';
import type { Json } from '@/types/supabase';
import { createSupabaseServerClient } from '@/infrastructure/supabase/client-server';

function toRecord(row: {
  id: string;
  event_id: string;
  pair_id: string;
  status: string;
  ai_generation_log: unknown;
  pptx_storage_path: string | null;
  created_at: string;
  updated_at: string;
}): SlideDeckRecord {
  return {
    id: row.id as DeckId,
    eventId: row.event_id as EventId,
    pairId: row.pair_id as PairId,
    status: row.status as SlideDeckRecord['status'],
    aiGenerationLog: row.ai_generation_log ?? null,
    pptxStoragePath: row.pptx_storage_path,
    createdAt: new Date(row.created_at),
    updatedAt: new Date(row.updated_at),
  };
}

export class SupabaseSlideDeckRepository implements SlideDeckRepository {
  async findById(id: DeckId): Promise<Result<SlideDeckRecord, NotFoundError>> {
    const supabase = await createSupabaseServerClient();
    const { data, error } = await supabase.from('slide_decks').select('*').eq('id', id).single();

    if (error || !data) {
      return err(new NotFoundError(`SlideDeck not found: ${id}`));
    }
    return ok(toRecord(data));
  }

  async findByPair(pairId: PairId): Promise<Result<SlideDeckRecord, NotFoundError>> {
    const supabase = await createSupabaseServerClient();
    const { data, error } = await supabase
      .from('slide_decks')
      .select('*')
      .eq('pair_id', pairId)
      .order('created_at', { ascending: false })
      .limit(1)
      .single();

    if (error || !data) {
      return err(new NotFoundError(`SlideDeck not found for pair: ${pairId}`));
    }
    return ok(toRecord(data));
  }

  async findByEvent(eventId: EventId): Promise<Result<readonly SlideDeckRecord[], never>> {
    const supabase = await createSupabaseServerClient();
    const { data } = await supabase
      .from('slide_decks')
      .select('*')
      .eq('event_id', eventId)
      .order('created_at', { ascending: true });

    return ok((data ?? []).map(toRecord));
  }

  async create(input: CreateSlideDeckInput): Promise<Result<SlideDeckRecord, never>> {
    const supabase = await createSupabaseServerClient();
    const { data, error } = await supabase
      .from('slide_decks')
      .insert({
        event_id: input.eventId,
        pair_id: input.pairId,
        status: 'draft',
      })
      .select('*')
      .single();

    if (error || !data) {
      throw new Error(`Failed to create SlideDeck: ${error?.message ?? 'unknown'}`);
    }
    return ok(toRecord(data));
  }

  async update(
    id: DeckId,
    input: UpdateSlideDeckInput,
  ): Promise<Result<SlideDeckRecord, NotFoundError>> {
    const supabase = await createSupabaseServerClient();

    const patch: { status?: string; ai_generation_log?: Json; pptx_storage_path?: string | null } =
      {};
    if (input.status !== undefined) patch['status'] = input.status;
    if (input.aiGenerationLog !== undefined)
      patch['ai_generation_log'] = input.aiGenerationLog as Json;
    if (input.pptxStoragePath !== undefined) patch['pptx_storage_path'] = input.pptxStoragePath;

    const { data, error } = await supabase
      .from('slide_decks')
      .update(patch)
      .eq('id', id)
      .select('*')
      .single();

    if (error || !data) {
      return err(new NotFoundError(`SlideDeck not found: ${id}`));
    }
    return ok(toRecord(data));
  }
}
