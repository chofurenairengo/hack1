---
name: /member-a-slide
description: メンバー A レーン (スライド・Gemini・pptxgenjs・管理画面・クロスメンバー型) の作業開始プロトコル。
---

# /member-a-slide

**対象**: メンバー A。スライド生成・AI 連携・pptxgenjs 出力・管理画面・クロスメンバー型契約の管轄。

## 管轄ディレクトリ

- `src/domain/slide/` — `SlideDeck` エンティティ、状態機械 (draft → preview → confirmed)
- `src/application/slide/` — `GenerateSlideDeck`, `SubmitSlideDeck`, `RejectSlideDeck` 等の Use Case
- `src/infrastructure/ai/gemini/` — `GeminiSlideGenerator` (4 役割プロンプト, JSON Schema)
- `src/infrastructure/pptx/` — `pptxgenjs` で PPTX エクスポート
- `src/app/(dashboard)/admin/**` — 主催者向け管理画面
- `src/types/api.ts`, `src/types/db.ts` — **クロスメンバー型契約** (A 管轄、他メンバーは合意ベース)
- `supabase/migrations/` — Phase 0 で A が整備、以降は他メンバーも PR 可

## 作業開始プロトコル

### Step 1: 関連ルール確認

次を**必ず読む**:
- [.claude/rules/ai-gemini-prompts.md](../rules/ai-gemini-prompts.md) — Gemini 4 役割プロンプトと NG カテゴリ
- [.claude/rules/supabase-rls.md](../rules/supabase-rls.md) — Phase 0 以降の migration ルール
- [.claude/rules/nextjs-app-router.md](../rules/nextjs-app-router.md) — Server Action 規約
- [.claude/rules/team-boundaries.md](../rules/team-boundaries.md) — 越境編集禁止
- `docs/tech_spec/02_a_slide.md` — A レーン技術仕様の真のソース

### Step 2: タスクの確認

次を明確にしてから実装:
- どのフィーチャー / Use Case を触るか
- 影響するテーブル / RLS 変更の有無
- クロスメンバー型 (`src/types/api.ts`) の変更が必要か
- 他レーンへの影響 (ある場合は事前合意)

### Step 3: TDD + 実装

1. **テスト先行** (`tests/slide/`):
   - Use Case のユニットテスト
   - Gemini モックでプロンプト構造検証 (4 役割 / JSON Schema / responseMimeType)
   - NG カテゴリ検知 (容姿描写を含む入力が `blocked: true`)
2. **ドメイン → アプリケーション → インフラ** の順に実装
3. **UI** (`src/app/(dashboard)/admin/**`) は shadcn/ui + Server Action

### Step 4: Gemini プロンプト変更時の追加確認

`src/infrastructure/ai/gemini/**` を変更したら、`gemini-prompt-reviewer` エージェントが **PROACTIVE 起動**する。指摘を必ず反映。

### Step 5: pptxgenjs

- 日本語フォント埋め込み (`Noto Sans JP` 等) をテスト
- 5 枚のスライドを Markdown / JSON から pptx 変換できること
- PowerPoint / Keynote で開けることを手動確認

### Step 6: クロスメンバー型変更時

`src/types/api.ts` / `src/types/db.ts` を変更する場合:
- 影響を受ける他メンバー (B/C/D) に事前通知
- PR で**全メンバーの承認**を得る
- 変更前後で破壊的変更がある場合は migration を添える

### Step 7: `/feature-development` に合流

大きな変更は `/feature-development` フローに従い、`planner` → `tdd-guide` → `code-reviewer` → `security-reviewer` を通す。

## Phase ごとの A の主な仕事

| Phase | 主な作業 |
|---|---|
| 0 (4/13-15) | 全スキーマ + RLS、`types/` 確定、CI/CD、`supabase gen types`、Vercel 連携 |
| 1 (4/16-19) | Gemini 疎通 PoC (単純な 4 役割プロンプトで 1 枚生成) |
| 2 (4/20-26) | スライド生成本実装 + UI、差し戻し機能、主催者管理画面 |
| 3 (4/27-5/3) | pptxgenjs 実装、複雑な脚本対応、エラーリトライ |
| 4 (5/4-10) | デモ脚本最終化、統合テスト、本番リハ |

## 関連

- [.claude/rules/ai-gemini-prompts.md](../rules/ai-gemini-prompts.md)
- [.claude/agents/gemini-prompt-reviewer.md](../agents/gemini-prompt-reviewer.md)
- `docs/tech_spec/02_a_slide.md`
