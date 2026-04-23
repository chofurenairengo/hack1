# `.claude/` ディレクトリ構成ガイド

Claude Code がこのプロジェクトで使う設定・ルール・コマンド・スキル・エージェントの一覧。

---

## 1. トップレベル構成

| パス | 種別 | 説明 |
|------|------|------|
| `.claude/settings.json` | 設定 | モデル選択・権限許可/拒否リスト・環境変数 (token 節約設定含む) |
| `.claude/hooks/hooks.json` | フック | PostToolUse トリガ定義 (TypeScript 編集ログ / マイグレーション追加時に rls-auditor 呼び出し) |
| `.claude/rules/` | ルール群 | Claude が常時読み込む不変量・コーディング規約 (11 ファイル) |
| `.claude/commands/` | スラッシュコマンド群 | `/command-name` で呼び出すワークフロー定義 (10 ファイル) |
| `.claude/skills/` | スキル群 | コマンドやエージェントが参照する詳細知識ベース (5 ディレクトリ) |
| `.claude/agents/` | エージェント群 | 特定トリガで自動起動するレビュアーエージェント (4 ファイル) |

---

## 2. Rules — 常時適用ルール

| ファイル | 適用範囲 | 概要 | 依存先 |
|----------|----------|------|--------|
| `tomokoi-guardrails.md` | `**/*.ts` `**/*.tsx` `**/*.sql` | プロジェクト不変量 26 条 (RLS 必須・投票秘匿・ビデオ OFF・アワード 3 種のみ等) | — (全ルールの基準点) |
| `nextjs-app-router.md` | `**/*.ts` `**/*.tsx` | Next.js 16 App Router・Server Action・Supabase クライアント分離 | `tomokoi-guardrails.md` |
| `supabase-rls.md` | `supabase/**/*` `**/*.sql` | マイグレーション命名・RLS ポリシーパターン 7 種・service role key 制限 | `tomokoi-guardrails.md` |
| `matching-algorithm.md` | `src/domain/matching/**` | k-partition 2-opt 純粋 TypeScript・外部ライブラリ禁止・決定性・ハード制約は物理排除 | `tomokoi-guardrails.md` |
| `ai-gemini-prompts.md` | `src/infrastructure/ai/**` `prompts/**` | Gemini 3 Flash・4 役割プロンプト必須・JSON Schema 強制・NG カテゴリ・原則日本語 | `tomokoi-guardrails.md` |
| `realtime-webrtc.md` | `src/infrastructure/realtime/**` `src/stores/realtime/**` | Supabase Broadcast 4 ch + WebRTC・ビデオ OFF・offline-first・C レーン一元管理 | `tomokoi-guardrails.md` |
| `vrm-avatar.md` | `src/components/avatar/**` `src/hooks/useAvatar*` | Three.js/@pixiv/three-vrm + MediaPipe・スマホ PoC 必須・prefers-reduced-motion | `tomokoi-guardrails.md` |
| `team-boundaries.md` | `src/**` | A/B/C/D レーン境界・クロスメンバー型契約 (`types/api.ts`) は A 管轄 | `tomokoi-guardrails.md` |
| `testing-tomokoi.md` | `**/*.test.ts` `**/*.spec.ts` | vitest + Playwright・80%+ カバレッジ・k-partition プロパティテスト必須 | `matching-algorithm.md` |
| `security-tomokoi.md` | `src/**` `supabase/**` | 投票データリーク禁止・署名 URL 10 分 TTL・secrets 非コミット | `tomokoi-guardrails.md` `supabase-rls.md` |
| `git-workflow-tomokoi.md` | `**` | conventional commits・PR テンプレ (RLS チェック欄・クロスメンバー型確認欄) | — |

---

## 3. Commands — スラッシュコマンド

| コマンド | 起動方法 | 概要 | 呼び出すエージェント / 参照ルール |
|----------|----------|------|-----------------------------------|
| `/feature-development` | 手動 | 大機能追加の全体フロー | planner → tdd-guide → code-reviewer → security-reviewer |
| `/database-migration` | 手動 | マイグレーション追加 + RLS + 型再生成 | `rls-auditor` エージェント / `supabase-rls.md` |
| `/rls-audit` | 手動 | 全テーブル RLS 監査 | `rls-auditor` エージェント |
| `/phase0-check` | 手動 | Phase 0 完了チェックリスト (スキーマ / RLS / CI / 型) | `supabase-rls.md` `team-boundaries.md` |
| `/member-a-slide` | 手動 | A レーン開始プロトコル (Gemini プロンプト・pptxgenjs・管理画面) | `gemini-prompt-reviewer` エージェント / `ai-gemini-prompts.md` |
| `/member-b-avatar` | 手動 | B レーン開始プロトコル (VRM・MediaPipe・スマホ PoC) | `vrm-avatar.md` / `vrm-mediapipe` スキル |
| `/member-c-realtime` | 手動 | C レーン開始プロトコル (4 チャンネル設計・WebRTC・offline fallback) | `realtime-reviewer` エージェント / `realtime-webrtc.md` |
| `/member-d-matching` | 手動 | D レーン開始プロトコル (投票・k-partition・チャット・顔写真同意) | `matching-reviewer` エージェント / `matching-algorithm.md` |
| `/match-test` | 手動 | k-partition ゴールデンテスト + ベンチマーク回帰 (N=20 で <300ms) | `matching-reviewer` エージェント / `testing-tomokoi.md` |
| `/integration-test` | 手動 | Phase 4 デモ脚本ベース E2E (Playwright) | e2e-runner エージェント |

---

## 4. Skills — 知識ベース

| ディレクトリ | 概要 | 参照元コマンド / エージェント |
|-------------|------|-------------------------------|
| `tomokoi/SKILL.md` | プロジェクト全体マップ・`docs/` 索引・用語集・フェーズロードマップ | 全コマンド・全エージェント |
| `k-partition-matching/SKILL.md` | Votes → テーブル割当フロー・ハード制約物理排除・iterator 版・Vercel 10 秒制約 | `/member-d-matching` `/match-test` `matching-reviewer` |
| `supabase-rls-patterns/SKILL.md` | RLS パターン 7 種の SQL テンプレ集 | `/database-migration` `/rls-audit` `rls-auditor` |
| `gemini-slide-generation/SKILL.md` | 4 役割プロンプトテンプレ・JSON Schema 定義・NG 検知フロー・pptxgenjs 連携 | `/member-a-slide` `gemini-prompt-reviewer` |
| `vrm-mediapipe/SKILL.md` | VRM ロード・MediaPipe FaceLandmarker・ブレンドシェイプ・スマホ PoC チェックリスト | `/member-b-avatar` |

---

## 5. Agents — 自動起動レビュアー

| エージェント | 自動起動トリガ | 概要 | 参照ルール / スキル |
|-------------|---------------|------|---------------------|
| `rls-auditor` | `supabase/migrations/*.sql` 変更時 | 全テーブルの RLS 有効化・ポリシー網羅・トモコイ固有チェック (votes / stamps / profile_photos) | `supabase-rls.md` `supabase-rls-patterns` |
| `matching-reviewer` | `src/domain/matching/**` 変更時 | 外部ライブラリ依存・純粋関数性・決定性・ハード制約方式・ベンチマーク回帰 | `matching-algorithm.md` `k-partition-matching` |
| `gemini-prompt-reviewer` | `src/infrastructure/ai/gemini/**` / `prompts/**` 変更時 | 4 役割構造・批評役最終段・JSON Schema・NG カテゴリ・API キー隔離 | `ai-gemini-prompts.md` `gemini-slide-generation` |
| `realtime-reviewer` | `src/infrastructure/realtime/**` / `src/hooks/use*Sync*.ts` 変更時 | ビデオ OFF 原則・越境アクセス禁止・4 チャンネル構成・匿名スタンプ・offline fallback | `realtime-webrtc.md` |

---

## 6. 依存関係マップ

```
CLAUDE.md
└── rules/ (常時適用)
    ├── tomokoi-guardrails.md ←── 全ルールの基準点
    ├── supabase-rls.md
    ├── matching-algorithm.md
    ├── ai-gemini-prompts.md
    ├── realtime-webrtc.md
    └── team-boundaries.md

commands/
├── /database-migration ──→ rls-auditor (agent) ──→ supabase-rls-patterns (skill)
├── /rls-audit ──────────→ rls-auditor (agent)
├── /member-a-slide ─────→ gemini-prompt-reviewer (agent) ──→ gemini-slide-generation (skill)
├── /member-b-avatar ────→ vrm-mediapipe (skill)
├── /member-c-realtime ──→ realtime-reviewer (agent)
├── /member-d-matching ──→ matching-reviewer (agent) ──→ k-partition-matching (skill)
├── /match-test ─────────→ matching-reviewer (agent)
└── /feature-development → planner → tdd-guide → code-reviewer → security-reviewer

hooks/hooks.json
├── TypeScript 編集 ──────→ ログ出力 (stub)
├── migrations/*.sql 追加 → rls-auditor (agent) 起動プロンプト
└── src/domain/matching 変更 → matching-reviewer (agent) 起動プロンプト
```

---

## 7. メンバーレーン × `.claude/` 利用マップ

| メンバー | 使うコマンド | 自動起動エージェント | 主参照ルール |
|----------|-------------|---------------------|-------------|
| A (スライド・管理・型) | `/member-a-slide` `/database-migration` `/phase0-check` | `gemini-prompt-reviewer` `rls-auditor` | `ai-gemini-prompts.md` `supabase-rls.md` `team-boundaries.md` |
| B (VRM・MediaPipe) | `/member-b-avatar` | — | `vrm-avatar.md` |
| C (Realtime・WebRTC) | `/member-c-realtime` `/database-migration` | `realtime-reviewer` `rls-auditor` | `realtime-webrtc.md` `supabase-rls.md` |
| D (投票・マッチング・チャット) | `/member-d-matching` `/match-test` `/database-migration` | `matching-reviewer` `rls-auditor` | `matching-algorithm.md` `security-tomokoi.md` |
| 全員共通 | `/feature-development` `/integration-test` | `code-reviewer` `security-reviewer` | `tomokoi-guardrails.md` `git-workflow-tomokoi.md` |
