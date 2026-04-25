'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
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

  useEffect(() => {
    mountedRef.current = true;
    const name = channelName.stamp(eventId);
    const channel = channelFactory.get(name);

    channel.on('broadcast', { event: 'stamp' }, ({ payload }: { payload: unknown }) => {
      if (!mountedRef.current) return;
      const parsed = StampPayloadSchema.safeParse(payload);
      if (parsed.success) setLastStamp(parsed.data);
    });

    channel.subscribe();

    return () => {
      mountedRef.current = false;
    };
  }, [eventId]);

  const sendStamp = useCallback(
    (kind: StampKind, pairId: PairId) => {
      const name = channelName.stamp(eventId);
      const channel = channelFactory.get(name);
      const clientNonce = `${Date.now()}-${Math.random().toString(36).slice(2)}`;
      channel.send({ type: 'broadcast', event: 'stamp', payload: { pairId, kind, clientNonce } });
    },
    [eventId],
  );

  return { sendStamp, lastStamp };
}
