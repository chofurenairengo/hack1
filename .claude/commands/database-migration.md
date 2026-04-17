---
description: Supabase / PostgreSQL スキーマ変更とマイグレーションの標準手順
---

# /database-migration

Supabase (PostgreSQL) のスキーマ変更は、以下の流れを**必ず**通す。

## 1. 設計確認

- `docs/technical_spec.md` §3「データベーススキーマ」の現状テーブル定義を確認する
- 変更が既存エンティティ (Users / Events / EventTickets / Participants / Pairs / Slides / Recommendations / Votes / Matches) に影響しないか洗い出す
- 追加カラムの型と NULL 可否を決める。デフォルト値は既存レコードの後方互換を壊さない値にする

## 2. マイグレーション作成

```bash
supabase migration new <snake_case_name>
```

- `supabase/migrations/<timestamp>_<name>.sql` に SQL を記述する
- 破壊的操作 (DROP COLUMN / RENAME) は**別マイグレーションに分ける**
- インデックスを忘れない (FK 列、`events.status`、`votes.event_id` など頻繁に絞る列)

## 3. Row Level Security (必須)

- 新しい / 変更したテーブルに**必ず** RLS ポリシーを書く
- 基本方針: **イベント参加者のみ** そのイベントに属するレコードを SELECT/UPDATE できる
- 例外方針を書いた場合、`docs/technical_spec.md` に明記する
- ポリシーが正しいか `rls-auditor` エージェントでレビューする

## 4. 型の再生成

```bash
supabase gen types typescript --local > types/supabase.ts
```

- フロントエンドのビルドを走らせて TypeScript エラーを解消する

## 5. docs/technical_spec.md §3 の更新

**カラム追加・変更・削除時は `docs/technical_spec.md` §3 の「主要エンティティ」表を同じ PR で必ず更新する。** Docs Sync Rule が存在するため CLAUDE.md 側も必要なら更新する。

## 6. テスト

- マッチング関連のテーブルなら Python SMI テストを実行
- RLS ポリシーの単体テスト (`pgTAP` か Supabase の RLS テストフレームワーク) を追加

## 7. ロールバック手順の記述

- 復旧可能な down マイグレーション、または手順書を PR 説明欄に書く
- 本番投入時は pgBouncer の接続を短時間止める必要があるか判断する

## hack1 固有のゲート

- [ ] Votes 以外のテーブルをマッチングアルゴリズムの入力に使っていない
- [ ] `users.gender` の値として `female` / `male` / `non_binary` / `prefer_not_to_say` のみを許容
- [ ] `users.preferred_genders` は配列で `any` を含めることができる
- [ ] `Events.mode` が `online` / `offline` のいずれかであることを DB レベルで制約 (CHECK)
