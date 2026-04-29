'use client';

import { useState, useEffect, useRef } from 'react';
import type { EventId } from '@/shared/types/ids';
import { channelName } from '@/infrastructure/realtime/channels';
import { createSupabaseBrowserClient } from '@/infrastructure/supabase/client-browser';

export type UsePresenceCountResult = {
  count: number;
};

export function usePresenceCount(eventId: EventId): UsePresenceCountResult {
  const [count, setCount] = useState(0);
  const channelRef = useRef<ReturnType<ReturnType<typeof createSupabaseBrowserClient>['channel']> | null>(null);

  useEffect(() => {
    const client = createSupabaseBrowserClient();
    const name = channelName.eventState(eventId);
    const channel = client.channel(name, {
      config: { presence: { key: `admin-${Math.random().toString(36).slice(2)}` } },
    });

    channelRef.current = channel;

    const updateCount = () => {
      const state = channel.presenceState();
      const presences = Object.values(state).flat() as Array<{ role?: string }>;
      const participants = presences.filter((presence) => presence.role !== 'admin');
      const total = participants.length > 0 ? participants.length : presences.length;
      setCount(total);
    };

    channel.on('presence', { event: 'sync' }, updateCount);
    channel.on('presence', { event: 'join' }, updateCount);
    channel.on('presence', { event: 'leave' }, updateCount);

    channel.subscribe(async (status) => {
      if (status === 'SUBSCRIBED') {
        await channel.track({ role: 'admin', joinedAt: Date.now() });
        updateCount();
      }
    });

    return () => {
      channel.untrack();
      channel.unsubscribe();
    };
  }, [eventId]);

  return { count };
}
