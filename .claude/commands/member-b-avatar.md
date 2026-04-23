---
name: /member-b-avatar
description: メンバー B レーン (VRM アバター・MediaPipe・スマホ PoC) の作業開始プロトコル。
---

# /member-b-avatar

**対象**: メンバー B。VRM アバター + MediaPipe 表情追従の管轄。

## 管轄ディレクトリ

- `src/infrastructure/avatar/` — VRM ロード、MediaPipe 推論、blendshape retarget
- `src/components/features/avatar/` — `AvatarCanvas`, `AvatarTile` 等の R3F コンポーネント

## 作業開始プロトコル

### Step 1: 関連ルール確認

次を**必ず読む**:
- [.claude/rules/vrm-avatar.md](../rules/vrm-avatar.md) — VRM + MediaPipe の全規約、スマホ PoC 最優先
- [.claude/rules/realtime-webrtc.md](../rules/realtime-webrtc.md) — C との連携 API (`useAvatarSync`)
- [.claude/rules/team-boundaries.md](../rules/team-boundaries.md) — B は C 経由でのみ Realtime にアクセス
- `docs/tech_spec/03_b_avator.md` — B レーン技術仕様

### Step 2: Phase 1 最優先タスク: スマホ PoC

**VRM 4 体同時描画 + MediaPipe がスマホ実機で動くか**を Phase 1 (4/16-4/19) までに必ず検証する。結果により以下を決定:

- **Go**: 本実装 (VRM 4 体、MediaPipe フル機能)
- **Fallback-1**: VRM 2 体 (登壇ペアのみ)、他は 2D
- **Fallback-2**: MediaPipe はデスクトップ限定
- **Fallback-3**: VRM 諦め、2D アバターで全員統一

PoC で測定:
- FPS (iPhone 12/13/14 / Pixel 6/7 / ミドルレンジ Android)
- GPU メモリ使用量
- MediaPipe CPU 使用率
- 熱暴走 (5 分連続)

### Step 3: TDD で本実装

> **テストファースト原則**: 各モジュールは `tdd-guide` エージェントを使い、RED (テスト失敗) → GREEN (最小実装) → REFACTOR の順で進める。コードを書く前にテストを書く。

1. `vrm-loader.ts` — `@pixiv/three-vrm` で VRM 読み込み (DRACO/meshopt 圧縮対応)
2. `mediapipe.ts` — `@mediapipe/tasks-vision` の FaceLandmarker 初期化
3. `retarget.ts` — blendshape → VRM Expression マッピング
4. `AvatarCanvas.tsx` (`"use client"`) — R3F シーン、`frameloop="demand"`
5. `AvatarTile.tsx` — 1 体分、他の参加者と並べるための薄い wrapper

### Step 4: Realtime 連携

- C が提供する `useAvatarSync(eventId)` を使う (直接 Supabase チャンネルに触らない)
- 送信ペイロードは圧縮: `{ userId, expression, mouthOpen, headRotation }` を 30Hz throttle
- 他の人の状態は subscription で受信、VRM に反映

### Step 5: アクセシビリティ

- `prefers-reduced-motion: reduce` を尊重し、微細モーションを止める
- カメラ許可を明示的に UI で確認 (`navigator.permissions.query({ name: "camera" })`)
- カメラ拒否時は静止立ち絵にフォールバック

### Step 6: テスト確認 (カバレッジ 80%+)

実装前に書いたテストがすべて GREEN であること、カバレッジが 80%+ であることを確認:

- VRM ロード成功 / 失敗のテスト
- MediaPipe モックでの retarget 正確性テスト (blendshape → Expression)
- `AvatarCanvas` のレンダリングテスト (RTL / vitest-browser)

## Phase ごとの B の主な仕事

| Phase | 主な作業 |
|---|---|
| 1 (4/16-19) | **スマホ PoC 必達** — VRM 4 体 + MediaPipe の実機動作可否判定 |
| 2 (4/20-26) | 本実装 (VRM ロード、表情追従、音声リップシンク連携) |
| 3 (4/27-5/3) | Realtime (C) との本結合、パフォーマンスチューニング |
| 4 (5/4-10) | リハーサル、画質/FPS 調整、フォールバック動作確認 |

## 関連

- [.claude/rules/vrm-avatar.md](../rules/vrm-avatar.md)
- [.claude/rules/realtime-webrtc.md](../rules/realtime-webrtc.md)
- `docs/tech_spec/03_b_avator.md`
