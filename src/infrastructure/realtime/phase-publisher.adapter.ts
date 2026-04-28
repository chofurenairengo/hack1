import 'server-only';
import type { PhasePublisherPort } from '@/application/event/ports/phase-publisher.port';
import type { EventId } from '@/shared/types/ids';
import type { EventPhase } from '@/domain/event/value-objects/event-phase.vo';
import type { Result } from '@/domain/shared/types/result';
import { ok, err } from '@/domain/shared/types/result';
import { channelName } from './channels';
import { createSupabaseAdminClient } from '@/infrastructure/supabase/client-admin';

export class SupabasePhasePublisher implements PhasePublisherPort {
  async publish(
    eventId: EventId,
    phase: EventPhase,
    round: number,
    startedAt: string,
  ): Promise<Result<void, Error>> {
    const supabase = createSupabaseAdminClient();
    const name = channelName.eventState(eventId);
    const channel = supabase.channel(name);

    const status = await channel.send({
      type: 'broadcast',
      event: 'state',
      payload: { phase, round, startedAt },
    });

    if (status !== 'ok') {
      return err(new Error(`Realtime broadcast failed: ${status}`));
    }

    return ok(undefined);
  }
}
