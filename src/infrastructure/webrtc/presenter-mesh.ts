import type { EventId, PairId } from '@/shared/types/ids';
import type { IceConfig } from './peer-connection.factory';
import type { PeerRole } from './peer-connection.factory';
import {
  createPeerConnection,
  createOffer,
  createAnswer,
  applyAnswer,
  addIceCandidate,
} from './peer-connection.factory';
import { AudioTrackManager } from './audio-track.manager';
import { SignalingChannel } from './signaling.channel';

export type MeshState = 'idle' | 'connecting' | 'connected' | 'failed' | 'closed';

type StateChangeHandler = (state: MeshState) => void;
type RemoteStreamHandler = (stream: MediaStream, peerId: string) => void;

/**
 * プレゼン枠の音声 P2P メッシュ。
 * presenter: マイク送信 + 受信
 * audience:  受信のみ (マイク不使用)
 */
export class PresenterMesh {
  private readonly signaling: SignalingChannel;
  private readonly audioManager: AudioTrackManager;
  private readonly role: PeerRole;
  private readonly iceConfig: IceConfig;
  private readonly peers = new Map<string, RTCPeerConnection>();

  private state: MeshState = 'idle';
  private onStateChange?: StateChangeHandler;
  private onRemoteStream?: RemoteStreamHandler;

  constructor(
    eventId: EventId,
    pairId: PairId,
    userId: string,
    role: PeerRole,
    iceConfig: IceConfig,
  ) {
    this.signaling = new SignalingChannel(eventId, pairId, userId);
    this.audioManager = new AudioTrackManager();
    this.role = role;
    this.iceConfig = iceConfig;
  }

  onStateChanged(handler: StateChangeHandler): void {
    this.onStateChange = handler;
  }

  onRemoteStreamReceived(handler: RemoteStreamHandler): void {
    this.onRemoteStream = handler;
  }

  async join(): Promise<void> {
    this.setState('connecting');

    if (this.role === 'presenter') {
      await this.audioManager.acquireMic();
    }

    await this.signaling.subscribe(async (msg) => {
      if (msg.type === 'offer' && msg.sdp) {
        await this.handleOffer(msg.from, msg.sdp);
      } else if (msg.type === 'answer' && msg.sdp) {
        await this.handleAnswer(msg.from, msg.sdp);
      } else if (msg.type === 'candidate' && msg.candidate) {
        await this.handleCandidate(msg.from, msg.candidate);
      }
    });

    const peers = this.signaling.getPeers();
    for (const peerId of peers) {
      await this.initiateConnectionTo(peerId);
    }

    if (peers.length > 0) this.setState('connected');
  }

  private async initiateConnectionTo(peerId: string): Promise<void> {
    const pc = this.buildPeerConnection(peerId);
    if (this.role === 'presenter') {
      this.audioManager.addTracksTo(pc);
    }
    const offer = await createOffer(pc);
    await this.signaling.send({ type: 'offer', to: peerId, sdp: offer });
  }

  private async handleOffer(from: string, sdp: RTCSessionDescriptionInit): Promise<void> {
    const pc = this.buildPeerConnection(from);
    if (this.role === 'presenter') {
      this.audioManager.addTracksTo(pc);
    }
    const answer = await createAnswer(pc, sdp);
    await this.signaling.send({ type: 'answer', to: from, sdp: answer });
    this.setState('connected');
  }

  private async handleAnswer(from: string, sdp: RTCSessionDescriptionInit): Promise<void> {
    const pc = this.peers.get(from);
    if (!pc) return;
    await applyAnswer(pc, sdp);
  }

  private async handleCandidate(
    from: string,
    candidate: RTCIceCandidateInit,
  ): Promise<void> {
    const pc = this.peers.get(from);
    if (!pc) return;
    await addIceCandidate(pc, candidate);
  }

  private buildPeerConnection(peerId: string): RTCPeerConnection {
    if (this.peers.has(peerId)) return this.peers.get(peerId)!;

    const pc = createPeerConnection(this.iceConfig);
    this.peers.set(peerId, pc);

    pc.onicecandidate = async ({ candidate }) => {
      if (candidate) {
        await this.signaling.send({ type: 'candidate', to: peerId, candidate: candidate.toJSON() });
      }
    };

    pc.onconnectionstatechange = () => {
      if (pc.connectionState === 'failed') {
        this.setState('failed');
      }
    };

    pc.ontrack = ({ streams }) => {
      const stream = streams[0];
      if (stream && this.onRemoteStream) {
        this.onRemoteStream(stream, peerId);
      }
    };

    return pc;
  }

  private setState(next: MeshState): void {
    if (this.state === next) return;
    this.state = next;
    this.onStateChange?.(next);
  }

  getState(): MeshState {
    return this.state;
  }

  async leave(): Promise<void> {
    this.setState('closed');
    for (const pc of this.peers.values()) {
      pc.close();
    }
    this.peers.clear();
    this.audioManager.stop();
    await this.signaling.unsubscribe();
  }
}
