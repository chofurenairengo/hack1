'use client';

import { useState, useRef, useCallback } from 'react';
import { PresenterMesh } from '@/infrastructure/webrtc/presenter-mesh';
import type { MeshState } from '@/infrastructure/webrtc/presenter-mesh';
import type { IceConfig, PeerRole } from '@/infrastructure/webrtc/peer-connection.factory';
import { asEventId, asPairId } from '@/shared/types/ids';

const TEST_EVENT_ID = 'a0000000-0000-0000-0000-000000000001';
const TEST_PAIR_ID = 'b0000000-0000-0000-0000-000000000001';

const ICE_CONFIG: IceConfig = {
  iceServers: [{ urls: 'stun:stun.l.google.com:19302' }, { urls: 'stun:stun1.l.google.com:19302' }],
};

const STATE_COLOR: Record<MeshState, string> = {
  idle: 'text-gray-400',
  connecting: 'text-yellow-400',
  connected: 'text-green-400',
  failed: 'text-red-400',
  closed: 'text-gray-500',
};

export default function WebRTCTestPage() {
  const [eventId, setEventId] = useState(TEST_EVENT_ID);
  const [pairId, setPairId] = useState(TEST_PAIR_ID);
  const [userId] = useState(() => crypto.randomUUID());
  const [role, setRole] = useState<PeerRole>('presenter');
  const [meshState, setMeshState] = useState<MeshState>('idle');
  const [log, setLog] = useState<string[]>([]);
  const meshRef = useRef<PresenterMesh | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  const addLog = useCallback((msg: string) => {
    const time = new Date().toLocaleTimeString('ja-JP');
    setLog((prev) => [`[${time}] ${msg}`, ...prev].slice(0, 50));
  }, []);

  const isJoined = meshState === 'connecting' || meshState === 'connected';

  const handleJoin = useCallback(async () => {
    const mesh = new PresenterMesh(asEventId(eventId), asPairId(pairId), userId, role, ICE_CONFIG);
    meshRef.current = mesh;

    mesh.onStateChanged((state) => {
      setMeshState(state);
      addLog(`状態変化: ${state}`);
    });

    mesh.onRemoteStreamReceived((stream, peerId) => {
      addLog(`リモートストリーム受信 peerId=${peerId.slice(0, 8)}...`);
      if (audioRef.current) {
        audioRef.current.srcObject = stream;
        audioRef.current.play().catch(() => {
          addLog('autoplay blocked — ページをクリックしてください');
        });
      }
    });

    addLog(`接続開始 role=${role} userId=${userId.slice(0, 8)}...`);
    setMeshState('connecting');

    try {
      await mesh.join();
      addLog('join() 完了');
    } catch (e) {
      addLog(`エラー: ${String(e)}`);
      setMeshState('failed');
    }
  }, [eventId, pairId, userId, role, addLog]);

  const handleLeave = useCallback(async () => {
    if (!meshRef.current) return;
    await meshRef.current.leave();
    meshRef.current = null;
    addLog('切断しました');
  }, [addLog]);

  return (
    <div className="min-h-screen bg-gray-950 text-white p-8 font-mono text-sm">
      <h1 className="text-lg font-bold mb-1">WebRTC PresenterMesh テスト</h1>
      <p className="text-xs text-gray-500 mb-6">
        このページを 2 タブで開き、同じ eventId / pairId を設定して Join してください
      </p>

      <div className="grid grid-cols-2 gap-8">
        <div className="space-y-4">
          <div>
            <label className="block text-xs text-gray-400 mb-1">Event ID</label>
            <input
              className="w-full bg-gray-800 border border-gray-700 px-3 py-2 rounded"
              value={eventId}
              onChange={(e) => setEventId(e.target.value)}
              disabled={isJoined}
            />
          </div>

          <div>
            <label className="block text-xs text-gray-400 mb-1">Pair ID</label>
            <input
              className="w-full bg-gray-800 border border-gray-700 px-3 py-2 rounded"
              value={pairId}
              onChange={(e) => setPairId(e.target.value)}
              disabled={isJoined}
            />
          </div>

          <div>
            <label className="block text-xs text-gray-400 mb-1">User ID (自動生成)</label>
            <input
              className="w-full bg-gray-700 border border-gray-700 px-3 py-2 rounded text-gray-400 cursor-not-allowed"
              value={userId}
              readOnly
            />
          </div>

          <div>
            <label className="block text-xs text-gray-400 mb-1">ロール</label>
            <div className="flex gap-3">
              {(['presenter', 'audience'] as const).map((r) => (
                <label key={r} className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="radio"
                    value={r}
                    checked={role === r}
                    onChange={() => setRole(r)}
                    disabled={isJoined}
                  />
                  <span className={r === 'presenter' ? 'text-blue-300' : 'text-purple-300'}>
                    {r === 'presenter' ? 'presenter (マイク送信)' : 'audience (受信のみ)'}
                  </span>
                </label>
              ))}
            </div>
          </div>

          <div className="flex gap-3 pt-2">
            <button
              onClick={handleJoin}
              disabled={isJoined}
              className="px-5 py-2 bg-blue-600 hover:bg-blue-500 disabled:opacity-40 disabled:cursor-not-allowed rounded font-bold"
            >
              Join
            </button>
            <button
              onClick={handleLeave}
              disabled={!isJoined}
              className="px-5 py-2 bg-red-700 hover:bg-red-600 disabled:opacity-40 disabled:cursor-not-allowed rounded font-bold"
            >
              Leave
            </button>
          </div>

          <div className="pt-1">
            <span className="text-gray-400">状態: </span>
            <span className={`font-bold ${STATE_COLOR[meshState]}`}>{meshState}</span>
          </div>

          <audio ref={audioRef} autoPlay />
        </div>

        <div>
          <p className="text-xs text-gray-400 mb-2">ログ (最新 50 件)</p>
          <div className="bg-gray-900 border border-gray-700 rounded p-3 h-72 overflow-y-auto space-y-1">
            {log.length === 0 && <p className="text-gray-600">— まだ何もありません —</p>}
            {log.map((entry, i) => (
              <p key={i} className="text-xs leading-relaxed">
                {entry}
              </p>
            ))}
          </div>
        </div>
      </div>

      <div className="mt-8 border border-gray-800 rounded p-4 text-xs text-gray-500 space-y-1">
        <p className="text-gray-300 font-bold mb-2">テスト手順</p>
        <p>1. このページを 2 つのタブで開く</p>
        <p>
          2. タブ A: role = <span className="text-blue-300">presenter</span> → Join
        </p>
        <p>
          3. タブ B: role = <span className="text-purple-300">audience</span> (または presenter) →
          Join
        </p>
        <p>4. タブ A でマイク許可ダイアログが出たら「許可」</p>
        <p>5. タブ B のログに「リモートストリーム受信」が出たら成功</p>
        <p>6. タブ A で話すと タブ B で音声が聞こえる</p>
      </div>
    </div>
  );
}
