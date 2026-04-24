---
name: tomokoi
description: トモコイ (Date My Mate JP) プロジェクト全体マップ — docs 索引、用語集、レーン分担、フェーズロードマップの一括参照。プロジェクトに関する質問や全体像が必要なときに使う。
tags: ['tomokoi', 'overview', 'docs', 'project']
---

# Skill: トモコイ プロジェクト全体マップ

## 起動タイミング

- プロジェクト全体像 / コンセプト / 参加枠を問われたとき
- どの docs / tech_spec を読むべきか迷ったとき
- レーン分担・Phase ロードマップを確認したいとき
- 用語の意味を確認したいとき

## コンセプト

**「Move Hands. Move Hearts.」** — 友人紹介型ライブマッチングイベント。紹介者が被紹介者をスライド + VRM アバターでプレゼン、オーディエンスが投票、独自 k-partition 2-opt でテーブル配置。1:1 チャット + 双方合意で顔写真公開。

- 最終発表: 2026-05-10 (オフライン・東大福武ホール)
- 審査カテゴリ: 技術 / 企画 / UX / 実装 / プレゼン
- 技術アピール §1.1: **k-partition 2-opt 自前実装**
- 技術アピール §1.2: **Gemini 3 Flash 4 役割プロンプト分化**

## Docs 索引

必ず最新の docs を真のソースとする:

| ファイル                                                                                                    | 主な内容                                                       |
| ----------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------- |
| [docs/tomokoi_spec_v5_3.md](../../../docs/tomokoi_spec_v5_3.md)                                             | 要件定義 v5.3、マニフェスト、UX フロー、ビジネスモデル、不変量 |
| [docs/tech_spec/00_tech_spec_overview.md](../../../docs/tech_spec/00_tech_spec_overview.md)                 | 技術仕様全体 + DB スキーマ + 4 人分担                          |
| [docs/tech_spec/01_foundation.md](../../../docs/tech_spec/01_foundation.md)                                 | Phase 0 基盤 (スキーマ / RLS / CI/CD)                          |
| [docs/tech_spec/02_a_slide.md](../../../docs/tech_spec/02_a_slide.md)                                       | A: スライド・Gemini・pptxgenjs                                 |
| [docs/tech_spec/03_b_avator.md](../../../docs/tech_spec/03_b_avator.md)                                     | B: VRM アバター・MediaPipe                                     |
| [docs/tech_spec/04_c_realtime.md](../../../docs/tech_spec/04_c_realtime.md)                                 | C: Realtime Broadcast + WebRTC                                 |
| [docs/tech_spec/05_d_voting_matching_epilogue.md](../../../docs/tech_spec/05_d_voting_matching_epilogue.md) | D: 投票・k-partition・チャット・顔写真                         |

## 用語集

| 用語                  | 意味                                                                     |
| --------------------- | ------------------------------------------------------------------------ |
| **紹介者**            | 被紹介者の友人。スライドで被紹介者をピッチする                           |
| **被紹介者**          | マッチング対象。紹介者と合意してイベント登場                             |
| **オーディエンス**    | 投票権あり、スタンプ送信、投票で登場者を評価                             |
| **登壇ペア**          | 紹介者 + 被紹介者の 2 人組                                               |
| **プレゼン枠**        | 紹介者 + 被紹介者ペアが必須の参加形態                                    |
| **オーディエンス枠**  | 投票のみの参加形態 (スタンプ可)                                          |
| **k-partition 2-opt** | トモコイ自前のテーブル割当アルゴリズム                                   |
| **Min-Regret Sum**    | 全参加者の後悔値総和を最小化する評価関数                                 |
| **Mingling**          | マッチ発表後の交流タイム (テーブルごと)                                  |
| **4 役割プロンプト**  | Gemini 3 Flash を構成 / コピーライター / 批評 / デザイナー の 4 役で駆動 |
| **批評役**            | Gemini プロンプトの最終段で NG 検知する役割                              |
| **Move Hands**        | スタンプで物理的に手を動かして盛り上げる UX コンセプト                   |
| **Move Hearts**       | 容姿ではなく内面エピソードで感情を動かす UX コンセプト                   |

## レーン分担 (4 人並列)

| メンバー | 主担当                                                                |
| -------- | --------------------------------------------------------------------- |
| **A**    | スライド・Gemini・pptxgenjs・管理画面・DB基盤                         |
| **B**    | PM・VRM アバター・MediaPipe 表情追従・クロスメンバー型契約            |
| **C**    | Realtime Broadcast (4 チャンネル) + WebRTC + 状態機械 + offline-first |
| **D**    | 投票・k-partition 2-opt・マッチ・1:1 チャット・顔写真同意             |

詳細は [team-boundaries.md](../../rules/team-boundaries.md) 参照。

## Phase ロードマップ

| Phase | 期間      | 主担当 | ゴール                                                   |
| ----- | --------- | ------ | -------------------------------------------------------- |
| 0     | 4/13-4/15 | A 単独 | 基盤 (スキーマ + RLS + CI/CD + クロスメンバー型)         |
| 1     | 4/16-4/19 | 全員   | 各レーン PoC、**B の VRM スマホ PoC が最重要**           |
| 2     | 4/20-4/26 | 全員   | 本実装、**中間発表 4/25**                                |
| 3     | 4/27-5/3  | 全員   | GW 集中: マッチング + チャット + 顔写真 + パフォーマンス |
| 4     | 5/4-5/10  | 全員   | 統合テスト + リハーサル + **最終発表 5/9-5/10**          |

## 技術スタック (再掲)

- Frontend: Next.js 16 + React 19 + Tailwind CSS v4 + shadcn/ui + framer-motion + Zustand + PWA
- Backend: Supabase (PostgreSQL + Auth + Realtime + Storage)
- AI: Google Gemini 3 Flash (JSON Schema)
- Matching: 独自 k-partition 2-opt (純粋 TypeScript)
- 3D: Three.js + @react-three/fiber + @pixiv/three-vrm + @mediapipe/tasks-vision
- Realtime/P2P: Supabase Realtime Broadcast + WebRTC
- PPTX: pptxgenjs
- Mail: Resend
- Hosting: Vercel (CI/CD + Edge Middleware)

## 関連スキル

- [k-partition-matching](../k-partition-matching/SKILL.md) — マッチングアルゴリズム詳細
- [supabase-rls-patterns](../supabase-rls-patterns/SKILL.md) — RLS パターン集
- [gemini-slide-generation](../gemini-slide-generation/SKILL.md) — 4 役割プロンプト設計
- [vrm-mediapipe](../vrm-mediapipe/SKILL.md) — VRM + MediaPipe 詳細
