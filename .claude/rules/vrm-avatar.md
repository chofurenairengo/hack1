---
description: "VRM アバター + MediaPipe 表情追従の設計規約 — Week 1 スマホ PoC 必須 / 4 体同時描画の致命リスク / prefers-reduced-motion 尊重"
globs: ["src/infrastructure/avatar/**/*", "src/components/features/avatar/**/*"]
alwaysApply: true
---

# VRM アバター + MediaPipe ルール

メンバー B 管轄。**非アニメ風 VRM** + MediaPipe で表情 / 口パク / 視線を追従し、Realtime Broadcast (`event:{id}:avatar`) で他参加者に同期する。

## 技術スタック

- `three` + `@react-three/fiber` + `@react-three/drei`
- `@pixiv/three-vrm` (VRM 1.0 サポート)
- `@mediapipe/tasks-vision` (FaceLandmarker, 顔ランドマーク検出)
- 音声は別レーン (C の WebRTC)

## Week 1 スマホ PoC が最優先

**VRM 4 体同時描画 + MediaPipe がスマホで実機動作するかは最重要リスク**。Phase 1 (4/16-4/19) に**必ずスマホ実機 PoC** を完了する。動かなければ以下のフォールバック:
1. VRM 4 体 → 2 体 (登壇ペアのみ VRM、他は 2D アバター)
2. MediaPipe をデスクトップ限定にし、モバイルは静止ポーズ
3. VRM を諦めて 2D アバターで全員統一

PoC で測定すべき指標:
- FPS (iPhone 12/13/14、Pixel 6/7、ミドルレンジ Android)
- GPU メモリ使用量
- MediaPipe の CPU 使用率
- 熱暴走 (5 分連続動作)

## アクセシビリティ

- **`prefers-reduced-motion` を尊重**する。ON なら VRM の微細モーションを止める
- カメラ使用時は明示的な UI 許可 (`navigator.permissions.query({ name: "camera" })`)
- カメラ拒否時のフォールバック: 静止立ち絵 + 音声のみ参加

## Realtime 連携 (C との境界)

- MediaPipe の FaceLandmarker 結果を `{ userId, blendshapes, headRotation, mouthOpen }` に圧縮
- C が提供する `useAvatarSync(eventId)` に `emit({ ... })` で送る
- 他の人の状態は `useAvatarSync` の subscription で受け取り、VRM の Expression / Bone に反映
- ペイロードは 30Hz 以下に **throttle**、ネットワーク逼迫を避ける

## コード構成

- `src/infrastructure/avatar/vrm-loader.ts` — VRM のロード + キャッシュ
- `src/infrastructure/avatar/mediapipe.ts` — FaceLandmarker 初期化 + 推論ループ
- `src/infrastructure/avatar/retarget.ts` — blendshape → VRM Expression マッピング
- `src/components/features/avatar/AvatarCanvas.tsx` — R3F シーン (`"use client"`)
- `src/components/features/avatar/AvatarTile.tsx` — 1 体分の Canvas タイル

## パフォーマンス

- VRM は `DRACO` / `meshopt` 圧縮を使う
- テクスチャは `basis` or `ktx2` 推奨
- `@react-three/fiber` の `frameloop="demand"` を基本にし、変化があったときのみ再描画
- MediaPipe の解像度は **192x192 以下** に抑える (精度より FPS)

## 禁止事項

- 実機 PoC 前に本実装を進めない (致命リスクの先送りは禁止)
- VRM 4 体同時描画が**必須前提の UI 設計**をしない (2 体フォールバックを常に想定)
- MediaPipe の推論結果を**生のランドマーク配列のまま Realtime に送らない** (帯域爆発)
- カメラ許可を得ずに `getUserMedia` を呼ばない

## 参考

- `docs/tech_spec/03_b_avator.md` — VRM + MediaPipe 詳細
- [realtime-webrtc.md](realtime-webrtc.md) — C との連携 API
- [team-boundaries.md](team-boundaries.md) — B レーン境界
