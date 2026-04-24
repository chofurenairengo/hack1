---
description: 'トモコイ Git ワークフロー — conventional commits / PR チェックリスト (RLS 同梱・クロスメンバー型合意・レーン遵守) / --no-verify 禁止'
globs: ['.github/**/*', 'CONTRIBUTING.md', 'docs/**/*']
alwaysApply: true
---

# Git Workflow — トモコイ特化

`~/.claude/rules/common/git-workflow.md` を継承し、**トモコイの 4 人並列開発に必要な追加規約**を定める。

## Commit Message

```
<type>: <description>

<optional body>

<optional footer>
```

`<type>`: `feat` / `fix` / `refactor` / `docs` / `test` / `chore` / `perf` / `ci`

Subject 行は 72 文字以内、日本語可 (プロジェクト内は日本語推奨)。

## ブランチ戦略

- `main` — 常にデプロイ可能
- `feat/<member>/<topic>` 例: `feat/a/slide-gemini-adapter`
- `fix/<topic>` — hot-fix
- **`main` への force push 禁止** (`.claude/settings.json` の deny に登録済み)

## PR テンプレート (チェック項目)

```markdown
## 概要

<変更の目的と要約>

## レーン

- [ ] A (スライド・管理)
- [ ] B (VRM)
- [ ] C (Realtime/WebRTC)
- [ ] D (投票・マッチング)

## チェックリスト

- [ ] このレーン向けの rules (`.claude/rules/*.md`) を遵守している
- [ ] 他レーン管轄のファイルを編集していない / 合意済み
- [ ] クロスメンバー型 (`src/types/api.ts`, `src/types/db.ts`) を変更していない / 変更する場合は影響レーンを PR に明記
- [ ] Supabase migration に RLS ポリシーを同梱した (スキーマ変更時)
- [ ] `src/types/supabase.ts` を再生成した (スキーマ変更時)
- [ ] テストを追加した (unit + integration / E2E は該当時)
- [ ] `pnpm lint` / `pnpm build` がローカルで通った
- [ ] シークレットをコミットしていない

## テストプラン

- [ ] <該当するテスト手順>
```

## pre-commit / CI

- **`--no-verify` 禁止**。pre-commit フックを必ず通す
- GitHub Actions で以下を実行:
  - `pnpm lint`
  - `pnpm tsc --noEmit`
  - `pnpm test --coverage`
  - `pnpm build`
  - (Phase 3 以降) `pnpm bench` で k-partition 回帰検知

## PR レビュー

- **レーン担当者 + 1 人**の 2-approve 必須
- RLS を含む migration は**メンバー A の承認必須**
- クロスメンバー型変更は**影響を受ける全レーンに PR レビューを依頼する**

## 禁止事項

- `--no-verify` で pre-commit を飛ばさない
- `main` に force push しない
- `.env*` / シークレットをコミットしない
- `.claude/settings.local.json` (存在する場合) をコミットしない (個人設定)
- Squash していない WIP commit の履歴を `main` に残さない (feature branch 内は OK)

## リリース (Phase 4 に関連)

- Phase 4 で`release/v1.0-demo` ブランチを切り、本番相当を Vercel の**プレビュー環境**にデプロイして最終確認
- 当日 (5/9-5/10) は `main` をフリーズし、hot-fix のみ許可
