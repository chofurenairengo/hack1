'use client';

import { useState, useEffect, useRef } from 'react';
import type { EventId } from '@/shared/types/ids';
import type { EventPhase } from '@/domain/event/value-objects/event-phase.vo';
import { StatePayloadSchema, type StatePayload } from '@/domain/event/value-objects/state.payload';
import { channelName } from '@/infrastructure/realtime/channels';
import { channelFactory } from '@/infrastructure/realtime/supabase-channel.factory';

export type UseEventPhaseResult = {
  phase: EventPhase | null;
  round: number;
  startedAt: string | null;
};

export type UseEventPhaseOptions = {
  presenceRole?: 'participant' | 'admin';
};

export function useEventPhase(
  eventId: EventId,
  options: UseEventPhaseOptions = {},
): UseEventPhaseResult {
  const [state, setState] = useState<StatePayload | null>(null);
  const mountedRef = useRef(true);
  const presenceRole = options.presenceRole ?? 'participant';

  useEffect(() => {
    mountedRef.current = true;
    const name = channelName.eventState(eventId);
    const channel = channelFactory.get(name, { presence: true });

    channel.on('broadcast', { event: 'state' }, ({ payload }: { payload: unknown }) => {
      if (!mountedRef.current) return;
      const parsed = StatePayloadSchema.safeParse(payload);
      if (parsed.success) setState(parsed.data);
    });

    channel.subscribe(async (status) => {
      if (status === 'SUBSCRIBED' && 'track' in channel) {
        await channel.track({ role: presenceRole, joinedAt: Date.now() });
      }
    });

    return () => {
      mountedRef.current = false;
      if ('untrack' in channel) {
        void channel.untrack();
      }
      void channelFactory.remove(name);
    };
  }, [eventId, presenceRole]);

  return {
    phase: state?.phase ?? null,
    round: state?.round ?? 0,
    startedAt: state?.startedAt ?? null,
  };
}
