'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
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

  useEffect(() => {
    mountedRef.current = true;
    const name = channelName.slideSync(eventId, pairId);
    const channel = channelFactory.get(name);

    channel.on('broadcast', { event: 'slide-sync' }, ({ payload }: { payload: unknown }) => {
      if (!mountedRef.current) return;
      const parsed = SlideSyncPayloadSchema.safeParse(payload);
      if (parsed.success) setCurrent(parsed.data);
    });

    channel.subscribe();

    return () => {
      mountedRef.current = false;
    };
  }, [eventId, pairId]);

  const broadcast = useCallback(
    (payload: SlideSyncPayload) => {
      const name = channelName.slideSync(eventId, pairId);
      const channel = channelFactory.get(name);
      channel.send({ type: 'broadcast', event: 'slide-sync', payload });
    },
    [eventId, pairId],
  );

  return { current, broadcast };
}
