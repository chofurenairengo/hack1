---
name: /feature-development
description: 大機能追加の全体フロー — planner → tdd-guide → code-reviewer → security-reviewer を順次起動する。
---

# /feature-development

**用途**: 複数ファイル・複数レーンにまたがる機能追加や、要件の複雑な変更のときに起動する統合ワークフロー。

## 実行プロトコル

以下を順に実行する。各ステップ完了後、次へ進む前に**ユーザーに要点を 1-2 行で報告**する。

### Step 0: Research & Reuse (必須)

- `docs/` と既存コードを検索し、同様の実装が既にないか確認
- `gh search repos` / `gh search code` で公開実装を探索 (時間があれば)
- 既存パッケージ (npm) / ライブラリで代替可能かを評価
- **新規コードを書く前に、既存を活かす選択肢があれば提示する**

### Step 1: Planning (planner エージェント)

`planner` エージェントを起動し、以下を含む実装計画を作成:

- 対象レーン (A / B / C / D / 横断)
- 影響する `src/` ディレクトリ / 新規作成ファイル
- `supabase/migrations/` 追加の有無 (ある場合は `/database-migration` を後で呼ぶ)
- クロスメンバー型 (`src/types/api.ts`) 変更の有無（変更は仕様外のため要注意）
- 既存ルール (`.claude/rules/*.md`) の関連項目
- テスト計画 (unit / integration / E2E)
- リスクと代替案

### Step 2: TDD (tdd-guide エージェント)

`tdd-guide` エージェントで以下を実行:

- テストファースト (RED): テストを書いて失敗させる
- 最小実装 (GREEN): テストを通す最小コード
- リファクタ (REFACTOR): 設計を整える
- カバレッジ確認: 80%+ を維持

### Step 3: Code Review (code-reviewer エージェント)

`code-reviewer` を起動し、以下を確認:

- `.claude/rules/` の関連ルール遵守
- イミュータブル / 型厳格 / 関数 50 行以内 / ファイル 400 行目安
- Server/Client 境界、Server Action 規約
- エラーハンドリング完全性

### Step 4: Security Review (security-reviewer エージェント)

`security-reviewer` を起動し、以下を確認:

- シークレット非コミット
- RLS ポリシー漏れ (新規テーブルがある場合)
- service role key のクライアント流出なし
- 投票秘密性の維持
- エラーメッセージに内部情報を露出していないか

### Step 5: Commit & Push

- conventional commits で意味のある単位でコミット
- PR 作成時は [.claude/rules/git-workflow-tomokoi.md](../rules/git-workflow-tomokoi.md) のテンプレートに従う

## 関連

- [.claude/rules/team-boundaries.md](../rules/team-boundaries.md) — 他レーン越境の扱い
- [.claude/commands/database-migration.md](database-migration.md) — DB 変更を含む場合
- [.claude/commands/rls-audit.md](rls-audit.md) — RLS を触る場合
