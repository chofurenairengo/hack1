export type IceConfig = {
  iceServers: RTCIceServer[];
};

export type PeerRole = 'presenter' | 'audience';

/**
 * RTCPeerConnection を生成する。
 * ビデオは常に OFF — offerToReceiveVideo は指定しない。
 */
export function createPeerConnection(iceConfig: IceConfig): RTCPeerConnection {
  return new RTCPeerConnection({
    iceServers: iceConfig.iceServers,
    iceTransportPolicy: 'all',
  });
}

export async function createOffer(pc: RTCPeerConnection): Promise<RTCSessionDescriptionInit> {
  const offer = await pc.createOffer({ offerToReceiveAudio: true });
  await pc.setLocalDescription(offer);
  return offer;
}

export async function createAnswer(
  pc: RTCPeerConnection,
  offer: RTCSessionDescriptionInit,
): Promise<RTCSessionDescriptionInit> {
  await pc.setRemoteDescription(new RTCSessionDescription(offer));
  const answer = await pc.createAnswer();
  await pc.setLocalDescription(answer);
  return answer;
}

export async function applyAnswer(
  pc: RTCPeerConnection,
  answer: RTCSessionDescriptionInit,
): Promise<void> {
  await pc.setRemoteDescription(new RTCSessionDescription(answer));
}

export async function addIceCandidate(
  pc: RTCPeerConnection,
  candidate: RTCIceCandidateInit,
): Promise<void> {
  if (pc.remoteDescription) {
    await pc.addIceCandidate(new RTCIceCandidate(candidate));
  }
}
