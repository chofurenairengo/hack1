---
description: "Supabase Realtime Broadcast + WebRTC の設計規約 — 4 チャンネル構成 / ビデオ OFF / offline-first / メンバー C 一元管理"
globs: ["src/infrastructure/realtime/**/*", "src/infrastructure/webrtc/**/*", "src/stores/realtime/**/*", "src/components/features/event/**/*"]
alwaysApply: true
---

# Realtime + WebRTC ルール

ライブイベントの中核。メンバー C が**一元管理**し、他レーンは C が公開する API (hooks / stores / events) 経由でのみ Realtime にアクセスする。

## 4 チャンネル構成 (C 管轄)

Supabase Realtime Broadcast を**イベントごとに 4 チャンネル**に分離する:

| チャンネル | 用途 | Payload |
|---|---|---|
| `event:{eventId}:phase` | フェーズ遷移 (lobby / pitch / voting / mingling / epilogue) | `{ phase, startedAt, meta }` |
| `event:{eventId}:slide` | スライド表示同期 (現在ページ / ハイライト) | `{ deckId, pageIndex, actorId }` |
| `event:{eventId}:stamp` | スタンプ (匿名、送信者 ID を保存しない) | `{ kind, position, timestamp }` |
| `event:{eventId}:avatar` | MediaPipe 表情 + 音声メタ (音声本体は WebRTC) | `{ userId, expression, mouthOpen }` |

- **ペイロードは zod スキーマで strict 検証**してから状態反映
- スタンプは**送信者 ID を保存しない**、`stamps` テーブルにも記録しない (匿名性)

## Offline-first

- Realtime 接続断でも UI が崩壊しない**ローカルキャッシュ**を維持する (`src/stores/realtime/`)
- 最終既知状態を `localStorage` にも保存し、再接続時に差分同期
- 接続切れの UI 表示は**控えめに** (派手なモーダルで進行を止めない)
- 切断中もスタンプはローカルキューに貯め、再接続後に送信

## WebRTC (登壇ペア音声のみ)

- **ビデオ配信 OFF**。`getUserMedia({ video: false, audio: true })` を厳守
- 登壇ペア (紹介者 + 被紹介者) 間の P2P 音声のみ
- オーディエンス側は WebRTC 受信せず、Realtime Broadcast で音声メタ (話者インジケータ等) だけ受ける
- STUN/TURN サーバは環境変数で指定 (`NEXT_PUBLIC_STUN_URLS`, `TURN_CREDENTIALS`)

## 状態機械 (Phase)

```
lobby → pitch → voting → mingling → epilogue
```

- 遷移は主催者 (管理画面) からの Server Action 経由のみ
- `event:{id}:phase` チャンネルで全参加者に broadcast
- 各レーンは「このフェーズでのみ有効な UI」を出し分ける

## React 層の利用規約

C が提供する hooks / stores 以外で**直接 `supabase.channel(...)` を呼ばない**。越境すると以下が壊れる:
- チャンネル重複購読
- 状態の二重ソース
- offline-first のキャッシュ整合性

提供予定の API (C が作る):
- `useEventPhase(eventId)` — 現在フェーズの取得 + 監視
- `useSlideSync(eventId)` — スライドページ同期
- `useStampBroadcast(eventId)` — スタンプ送受信
- `useAvatarSync(eventId)` — アバター表情同期

## 禁止事項

- **ビデオ配信を追加しない** (UI 上もトグルを置かない)
- スタンプに送信者 ID を保持しない
- 他レーンから直接 Realtime チャンネルを生やさない
- `SUPABASE_SERVICE_ROLE_KEY` を Realtime 側で使わない (anon + RLS で完結)
- 接続断で進行を止めるモーダルを出さない

## 参考

- `docs/tech_spec/04_c_realtime.md` — 4 チャンネル詳細 + WebRTC シグナリング
- [tomokoi-guardrails.md](tomokoi-guardrails.md) — ビデオ OFF 原則
- [team-boundaries.md](team-boundaries.md) — C の責任境界
