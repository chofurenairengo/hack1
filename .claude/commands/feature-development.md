---
description: hack1 新機能・機能追加のエンドツーエンドワークフロー (Research → Plan → TDD → Review → Commit)
---

# /feature-development

新しい機能や大きめの変更を加えるときは、以下を**上から順に**実行する。どの段階も省略しない。

## 1. Research & Reuse (必須)

- `gh search repos` / `gh search code` で既存実装を先に探す
- Context7 または公式ドキュメントで API 挙動を確認する
- npm / PyPI を検索し、自前実装より battle-tested なライブラリがないか確認する
- **ただし SMI マッチングは `matching` 等のライブラリを使わない (技術アピール §1.1)**

## 2. Plan

- `planner` エージェントに計画を作らせる
- `docs/technical_spec.md` と `docs/requirements.md` の該当セクションを必ず引用する
- 依存とリスクを洗い出し、フェーズに分解する
- データベーススキーマに触れる場合は `rls-auditor` による事前レビューを計画に含める

## 3. TDD (Red → Green → Refactor)

- `tdd-guide` エージェントで駆動する
- 失敗するテストを先に書き、最小実装で緑にし、その後リファクタする
- 80% 以上のカバレッジを確認する
- **SMI 拡張に触る場合**: Min-Regret Sum / 男女比均等化の境界値ケースを固定で追加する (`python-smi` ルール参照)

## 4. Code Review

- `code-reviewer` を機能完成直後に走らせる
- SMI 関連なら `smi-reviewer`、Supabase 関連なら `rls-auditor`、AI スライド関連なら `multi-agent-designer` を追加で起動
- CRITICAL / HIGH の指摘は**必ず**解消してから次に進む

## 5. Security & Secrets

- `.env` や認証情報をコードに埋めていないことを確認
- 新しい外部 API を足した場合はレート制限を設定する
- ユーザー入力は境界で Zod などにより必ず検証する

## 6. Commit & Push

- Conventional Commits (`feat: ...`, `fix: ...`) に従う
- 1 コミット 1 論点。壊れていないものを一緒にリファクタしない
- PR 作成時は `git diff main...HEAD` を見てサマリを書く
- **RLS を含まないスキーマ変更の PR は出さない**

## hack1 固有のゲート

- [ ] Recommendations (紹介者推薦フラグ) をマッチングの入力に渡していない
- [ ] LGBTQ+ 配慮: `gender` が未回答 / 非二元の場合の扱いを壊していない
- [ ] 「異性から人気1位」のようなランキング系アワードを追加していない
- [ ] オフラインモードでの動作 (ネットワーク切断時のフォールバック) を壊していない
