---
description: 新しい言語/フレームワークを導入したときに `.claude/rules/` にルールを追加するワークフロー
---

# /add-language-rules

プロジェクトに新しい言語 (Rust / Go / Elixir 等) や重要なフレームワーク (Tauri / Electron / gRPC 等) を導入する場合、`.claude/rules/` に規約を置き、CLAUDE.md とコマンドからリンクする。

## 1. 必要性の判定

- 一度きりのスクリプトのためだけに新言語を足さない (`requirements.md` のスコープ外)
- ハッカソン期間中 (〜2026-05-08) に 3 箇所以上で使われる見込みがあるか
- 既存スタック (Next.js + Supabase + Python) で代替できないか先に検討する

## 2. ルールファイル作成

ファイル名: `.claude/rules/<lang>-<scope>.md`

必須セクション:

1. **スコープ** — どこまでこの言語で書くか (例: 「SMI ソルバ本体と CLI のみ。Web API からの呼び出しは Python」)
2. **コーディング規約** — フォーマッタ (rustfmt / gofmt) / lint (clippy / staticcheck) / エラーハンドリング方針
3. **テスト方針** — テストランナー・カバレッジ目標 (80%+) ・境界値ケースの扱い
4. **依存の選定基準** — 公式 / 著名ライブラリのみを採用、セキュリティ監査済みのもの
5. **hack1 固有の禁止事項** — このプロジェクトで特に避けるパターン

## 3. CLAUDE.md とコマンドへのリンク

- CLAUDE.md の "Workflow Pointers" セクションに新ルールへのリンクを追加する
- `.claude/commands/feature-development.md` の「Review」ステップに、この言語に触れたときに起動するレビューエージェントを明記する

## 4. エージェントの追加 (任意)

既存の `.claude/agents/` に新言語のレビュアーが無い場合、必要なら `<lang>-reviewer.md` を追加する。命名と frontmatter は既存エージェントに合わせる。

## 5. CI への登録

- GitHub Actions に fmt / lint / test を登録し、PR で自動実行させる
- キャッシュ戦略を書いて 5 分以内で終わるように

## チェックリスト

- [ ] 新言語の導入理由を `docs/technical_spec.md` の §2 に追記した
- [ ] `.claude/rules/<lang>-*.md` を作成した
- [ ] CLAUDE.md の Workflow Pointers を更新した
- [ ] 対応するレビューエージェントが存在するか新規作成した
