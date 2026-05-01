'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import type { RealtimeChannel } from '@supabase/supabase-js';
import type { EventId, PairId } from '@/shared/types/ids';
import type { StampKind } from '@/domain/stamp/value-objects/stamp-kind.vo';
import { StampPayloadSchema, type StampPayload } from '@/domain/stamp/value-objects/stamp.payload';
import { channelName } from '@/infrastructure/realtime/channels';
import { channelFactory } from '@/infrastructure/realtime/supabase-channel.factory';

export type UseStampBroadcastResult = {
  /** 送信者IDなし匿名スタンプを送信する */
  sendStamp: (kind: StampKind, pairId: PairId) => void;
  lastStamp: StampPayload | null;
};

export function useStampBroadcast(eventId: EventId): UseStampBroadcastResult {
  const [lastStamp, setLastStamp] = useState<StampPayload | null>(null);
  const mountedRef = useRef(true);
  const channelRef = useRef<RealtimeChannel | null>(null);

  useEffect(() => {
    mountedRef.current = true;
    const name = channelName.stamp(eventId);
    const channel = channelFactory.get(name);
    channelRef.current = channel;

    channel.on('broadcast', { event: 'stamp' }, ({ payload }: { payload: unknown }) => {
      if (!mountedRef.current) return;
      const parsed = StampPayloadSchema.safeParse(payload);
      if (parsed.success) setLastStamp(parsed.data);
    });

    channel.subscribe();

    return () => {
      mountedRef.current = false;
      channelRef.current = null;
      void channelFactory.remove(name);
    };
  }, [eventId]);

  const sendStamp = useCallback((kind: StampKind, pairId: PairId) => {
    const clientNonce = `${Date.now()}-${Math.random().toString(36).slice(2)}`;
    channelRef.current?.send({
      type: 'broadcast',
      event: 'stamp',
      payload: { pairId, kind, clientNonce },
    });
  }, []);

  return { sendStamp, lastStamp };
}
