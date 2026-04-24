---
name: /member-c-realtime
description: メンバー C レーン (Realtime Broadcast 4 チャンネル + WebRTC + 状態機械 + offline-first) の作業開始プロトコル。
---

# /member-c-realtime

**対象**: メンバー C。Supabase Realtime の中心管理者、WebRTC シグナリング、イベント状態機械、offline-first フォールバックの管轄。**全レーンが C の API を経由する**ため、設計品質の影響が最も広い。

## 管轄ディレクトリ

- `src/infrastructure/realtime/` — Supabase Realtime Broadcast の 4 チャンネル管理
- `src/infrastructure/webrtc/` — WebRTC シグナリング + P2P 音声 (登壇ペア)
- `src/stores/realtime/` — Zustand (Realtime 状態キャッシュ)
- `src/hooks/useEventPhase.ts`, `src/hooks/useSlideSync.ts`, `src/hooks/useStampBroadcast.ts`, `src/hooks/useAvatarSync.ts` — 他レーンに公開する API

## 作業開始プロトコル

### Step 1: 関連ルール確認

次を**必ず読む**:

- [.claude/rules/realtime-webrtc.md](../rules/realtime-webrtc.md) — 4 チャンネル構成、ビデオ OFF 原則、offline-first
- [.claude/rules/tomokoi-guardrails.md](../rules/tomokoi-guardrails.md) — ビデオ配信絶対禁止、匿名スタンプ
- [.claude/rules/team-boundaries.md](../rules/team-boundaries.md) — 他レーンが C の API を使う境界
- `docs/tech_spec/04_c_realtime.md` — C レーン技術仕様

### Step 2: TDD で 4 チャンネル設計・実装

> **テストファースト原則**: 各チャンネル・各 hook は `tdd-guide` エージェントを使い、RED (テスト失敗) → GREEN (最小実装) → REFACTOR の順で進める。設計後すぐに実装へ入らず、まずテストを書く。

イベントごとに 4 チャンネルを張る:

| チャンネル               | 責務                                                | Payload 型       |
| ------------------------ | --------------------------------------------------- | ---------------- |
| `event:{eventId}:phase`  | フェーズ遷移 (lobby/pitch/voting/mingling/epilogue) | `PhaseEvent`     |
| `event:{eventId}:slide`  | スライド表示同期                                    | `SlideSyncEvent` |
| `event:{eventId}:stamp`  | 匿名スタンプ (送信者 ID 保存しない)                 | `StampEvent`     |
| `event:{eventId}:avatar` | MediaPipe 表情 + 音声メタ                           | `AvatarEvent`    |

- 各 Payload を zod で strict 検証してから state 反映
- 型は `src/types/api.ts` (B（PM）が Phase 0 で定義) を参照

### Step 3: WebRTC シグナリング

- Realtime を signaling チャンネルとして使う (`event:{id}:webrtc-signal`)
- 登壇ペア (紹介者 + 被紹介者) の P2P 音声のみ
- **ビデオ `video: false` を強制**、トグル UI は作らない
- STUN/TURN: `NEXT_PUBLIC_STUN_URLS` + `TURN_CREDENTIALS` (env)

### Step 4: Offline-first

- 最終既知状態を Zustand + `localStorage` にキャッシュ
- 接続切れ時は UI を**控えめに**表示 (進行を止めない)
- 切断中のスタンプ / 投票はローカルキューで保持、再接続時に送信
- 再接続時は**差分同期** (Realtime は broadcast のみのため、subscription 再張り付け + 直近ログを DB から fetch)

### Step 5: 他レーンへの API 公開

C が公開する hooks 以外で他レーンが Realtime に触れてはいけない。公開する hooks:

```ts
// src/hooks/useEventPhase.ts
export function useEventPhase(eventId: string): {
  phase: Phase;
  transition: (next: Phase) => Promise<void>;
};

// src/hooks/useSlideSync.ts
export function useSlideSync(eventId: string): {
  currentPage: number;
  setPage: (page: number) => void;
};

// src/hooks/useStampBroadcast.ts
export function useStampBroadcast(eventId: string): {
  send: (kind: StampKind) => void;
  recent: Stamp[];
};

// src/hooks/useAvatarSync.ts
export function useAvatarSync(eventId: string): {
  emit: (state: AvatarState) => void;
  others: Record<UserId, AvatarState>;
};
```

### Step 6: テスト確認 (カバレッジ 80%+)

実装前に書いたテストがすべて GREEN であること、カバレッジが 80%+ であることを確認:

- 各チャンネルの broadcast/subscribe 単体テスト (Supabase local)
- 2 タブエコーテスト (Phase 1 で早期実施)
- 切断 → 再接続シナリオ
- 負荷テスト (20 人同時接続、スタンプ 1/sec 相当)

### Step 7: realtime-reviewer エージェント

`src/infrastructure/realtime/**` / `src/stores/realtime/**` / `src/hooks/use*Sync*.ts` を変更すると **`realtime-reviewer` が PROACTIVE 起動**する。指摘を必ず反映。

## Phase ごとの C の主な仕事

| Phase        | 主な作業                                                  |
| ------------ | --------------------------------------------------------- |
| 1 (4/16-19)  | 2 タブエコー PoC (phase + stamp チャンネルだけで動作確認) |
| 2 (4/20-26)  | 4 チャンネル本実装、hooks 公開、offline キャッシュ        |
| 3 (4/27-5/3) | WebRTC 本実装、切断/再接続のロバスト性向上                |
| 4 (5/4-10)   | 負荷試験、本番相当 N=20 接続での動作確認                  |

## 関連

- [.claude/rules/realtime-webrtc.md](../rules/realtime-webrtc.md)
- [.claude/agents/realtime-reviewer.md](../agents/realtime-reviewer.md)
- `docs/tech_spec/04_c_realtime.md`
