/**
 * マイク取得・トラック管理。ビデオは一切取得しない。
 */
export class AudioTrackManager {
  private stream: MediaStream | null = null;

  async acquireMic(): Promise<MediaStream> {
    if (this.stream) return this.stream;
    this.stream = await navigator.mediaDevices.getUserMedia({ audio: true, video: false });
    return this.stream;
  }

  addTracksTo(pc: RTCPeerConnection): void {
    if (!this.stream) throw new Error('マイク未取得。先に acquireMic() を呼んでください。');
    for (const track of this.stream.getAudioTracks()) {
      pc.addTrack(track, this.stream);
    }
  }

  stop(): void {
    this.stream?.getTracks().forEach((t) => t.stop());
    this.stream = null;
  }
}
