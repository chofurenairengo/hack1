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
type PeersChangedHandler = (peerIds: string[]) => void;

const SUBSCRIBE_TIMEOUT_MS = 10_000;

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

  private get channelOptions() {
    return { presence: true, presenceKey: this.userId };
  }

  async subscribe(onSignal: SignalHandler, onPeersChanged?: PeersChangedHandler): Promise<void> {
    const channel = channelFactory.get(this.name, this.channelOptions);

    channel.on('broadcast', { event: 'signal' }, ({ payload }: { payload: unknown }) => {
      const msg = payload as SignalMessage;
      if (msg.to === this.userId) {
        onSignal(msg);
      }
    });

    if (onPeersChanged) {
      const notifyPeersChanged = () => onPeersChanged(this.getPeers());
      channel.on('presence', { event: 'sync' }, notifyPeersChanged);
      channel.on('presence', { event: 'join' }, notifyPeersChanged);
      channel.on('presence', { event: 'leave' }, notifyPeersChanged);
    }

    await new Promise<void>((resolve, reject) => {
      let settled = false;
      const timeoutId = setTimeout(() => {
        if (settled) return;
        settled = true;
        reject(new Error('signaling channel subscribe timed out'));
      }, SUBSCRIBE_TIMEOUT_MS);

      channel.subscribe((status) => {
        if (settled) return;
        if (status === 'SUBSCRIBED') {
          settled = true;
          clearTimeout(timeoutId);
          resolve();
        } else if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT' || status === 'CLOSED') {
          settled = true;
          clearTimeout(timeoutId);
          reject(new Error(`signaling channel subscribe failed: ${status}`));
        }
      });
    });

    await channel.track({ userId: this.userId, joinedAt: Date.now() });
    onPeersChanged?.(this.getPeers());
  }

  async send(msg: Omit<SignalMessage, 'from'>): Promise<void> {
    const channel = channelFactory.get(this.name, this.channelOptions);
    await channel.send({
      type: 'broadcast',
      event: 'signal',
      payload: { ...msg, from: this.userId } satisfies SignalMessage,
    });
  }

  /** Presence から自分以外の参加者 userId を返す */
  getPeers(): string[] {
    const channel = channelFactory.get(this.name, this.channelOptions);
    const state = channel.presenceState<{ userId: string }>();
    return [
      ...new Set(
        Object.values(state)
          .flat()
          .map((p) => p.userId)
          .filter((id) => id !== this.userId),
      ),
    ];
  }

  async unsubscribe(): Promise<void> {
    await channelFactory.remove(this.name);
  }
}
