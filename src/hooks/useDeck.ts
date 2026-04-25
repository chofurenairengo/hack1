'use client';

import { useEffect, useState } from 'react';
import { createSupabaseBrowserClient } from '@/infrastructure/supabase/client-browser';
import type { SlideDeckRecord } from '@/domain/slide/repositories/slide-deck.repository';
import type { DeckId, EventId, PairId } from '@/shared/types/ids';

type UseDeckResult = {
  deck: SlideDeckRecord | null;
  isLoading: boolean;
  error: string | null;
};

export function useDeck(deckId: DeckId): UseDeckResult {
  const [deck, setDeck] = useState<SlideDeckRecord | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    const supabase = createSupabaseBrowserClient();

    supabase
      .from('slide_decks')
      .select('*')
      .eq('id', deckId)
      .single()
      .then(({ data, error: fetchError }) => {
        if (cancelled) return;
        if (fetchError || !data) {
          setError('スライドが見つかりません');
          setIsLoading(false);
          return;
        }
        setDeck({
          id: data.id as DeckId,
          eventId: data.event_id as EventId,
          pairId: data.pair_id as PairId,
          status: data.status as SlideDeckRecord['status'],
          aiGenerationLog: data.ai_generation_log ?? null,
          pptxStoragePath: data.pptx_storage_path,
          createdAt: new Date(data.created_at),
          updatedAt: new Date(data.updated_at),
        });
        setIsLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [deckId]);

  return { deck, isLoading, error };
}
