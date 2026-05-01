'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import type { RealtimeChannel } from '@supabase/supabase-js';
import type { EventId, PairId } from '@/shared/types/ids';
import {
  SlideSyncPayloadSchema,
  type SlideSyncPayload,
} from '@/domain/event/value-objects/slide-sync.payload';
import { channelName } from '@/infrastructure/realtime/channels';
import { channelFactory } from '@/infrastructure/realtime/supabase-channel.factory';

export type UseSlideSyncResult = {
  current: SlideSyncPayload | null;
  broadcast: (payload: SlideSyncPayload) => void;
};

export function useSlideSync(eventId: EventId, pairId: PairId): UseSlideSyncResult {
  const [current, setCurrent] = useState<SlideSyncPayload | null>(null);
  const mountedRef = useRef(true);
  const channelRef = useRef<RealtimeChannel | null>(null);

  useEffect(() => {
    mountedRef.current = true;
    const name = channelName.slideSync(eventId, pairId);
    const channel = channelFactory.get(name);
    channelRef.current = channel;

    channel.on('broadcast', { event: 'slide-sync' }, ({ payload }: { payload: unknown }) => {
      if (!mountedRef.current) return;
      const parsed = SlideSyncPayloadSchema.safeParse(payload);
      if (parsed.success) setCurrent(parsed.data);
    });

    channel.subscribe();

    return () => {
      mountedRef.current = false;
      channelRef.current = null;
      void channelFactory.remove(name);
    };
  }, [eventId, pairId]);

  const broadcast = useCallback((payload: SlideSyncPayload) => {
    channelRef.current?.send({ type: 'broadcast', event: 'slide-sync', payload });
  }, []);

  return { current, broadcast };
}
