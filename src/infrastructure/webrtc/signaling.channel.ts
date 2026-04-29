import type { EventId, PairId } from '@/shared/types/ids';
import { channelName } from '@/infrastructure/realtime/channels';
import { channelFactory } from '@/infrastructure/realtime/supabase-channel.factory';

export type SignalType = 'offer' | 'answer' | 'candidate';

export type SignalMessage = {
  readonly type: SignalType;
  readonly from: string;
  readonly to: string;
  readonly sdp?: RTCSessionDescriptionInit;
  readonly candidate?: RTCIceCandidateInit;
};

type SignalHandler = (msg: SignalMessage) => void;

/**
 * プレゼン枠の WebRTC シグナリングを Supabase Realtime Broadcast で行う。
 * Presence でピア検出、Broadcast で offer/answer/candidate を交換する。
 */
export class SignalingChannel {
  private readonly name: string;
  private readonly userId: string;

  constructor(eventId: EventId, pairId: PairId, userId: string) {
    this.name = channelName.presenterSignal(eventId, pairId);
    this.userId = userId;
  }

  async subscribe(onSignal: SignalHandler): Promise<void> {
    const channel = channelFactory.get(this.name, { presence: true });

    channel.on('broadcast', { event: 'signal' }, ({ payload }: { payload: unknown }) => {
      const msg = payload as SignalMessage;
      if (msg.to === this.userId) {
        onSignal(msg);
      }
    });

    await new Promise<void>((resolve, reject) => {
      channel.subscribe((status) => {
        if (status === 'SUBSCRIBED') resolve();
        else if (status === 'CHANNEL_ERROR') reject(new Error('signaling channel error'));
      });
    });

    await channel.track({ userId: this.userId, joinedAt: Date.now() });
  }

  async send(msg: Omit<SignalMessage, 'from'>): Promise<void> {
    const channel = channelFactory.get(this.name, { presence: true });
    await channel.send({
      type: 'broadcast',
      event: 'signal',
      payload: { ...msg, from: this.userId } satisfies SignalMessage,
    });
  }

  /** Presence から自分以外の参加者 userId を返す */
  getPeers(): string[] {
    const channel = channelFactory.get(this.name, { presence: true });
    const state = channel.presenceState<{ userId: string }>();
    return Object.values(state)
      .flat()
      .map((p) => p.userId)
      .filter((id) => id !== this.userId);
  }

  async unsubscribe(): Promise<void> {
    await channelFactory.remove(this.name);
  }
}
