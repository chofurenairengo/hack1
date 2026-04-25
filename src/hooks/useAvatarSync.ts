'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import type { EventId, PairId } from '@/shared/types/ids';
import {
  ExpressionPayloadSchema,
  type ExpressionPayload,
} from '@/domain/avatar/value-objects/expression.payload';
import { channelName } from '@/infrastructure/realtime/channels';
import { channelFactory } from '@/infrastructure/realtime/supabase-channel.factory';

export type UseAvatarSyncResult = {
  emit: (payload: ExpressionPayload) => void;
  expressions: Record<string, ExpressionPayload>;
};

export function useAvatarSync(eventId: EventId, pairId: PairId): UseAvatarSyncResult {
  const [expressions, setExpressions] = useState<Record<string, ExpressionPayload>>({});
  const mountedRef = useRef(true);

  useEffect(() => {
    mountedRef.current = true;
    const name = channelName.expression(eventId, pairId);
    const channel = channelFactory.get(name);

    channel.on('broadcast', { event: 'expression' }, ({ payload }: { payload: unknown }) => {
      if (!mountedRef.current) return;
      const parsed = ExpressionPayloadSchema.safeParse(payload);
      if (parsed.success) {
        setExpressions((prev) => ({ ...prev, [parsed.data.userId]: parsed.data }));
      }
    });

    channel.subscribe();

    return () => {
      mountedRef.current = false;
    };
  }, [eventId, pairId]);

  const emit = useCallback(
    (payload: ExpressionPayload) => {
      const name = channelName.expression(eventId, pairId);
      const channel = channelFactory.get(name);
      channel.send({ type: 'broadcast', event: 'expression', payload });
    },
    [eventId, pairId],
  );

  return { emit, expressions };
}
