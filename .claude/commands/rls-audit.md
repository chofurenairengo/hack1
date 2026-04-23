---
name: /rls-audit
description: 全テーブルの RLS 監査 — rls-auditor エージェントを明示的に起動して総点検する。
---

# /rls-audit

**用途**: 定期的 (Phase 0 完了時、中間発表前、最終発表前) に全テーブルの RLS を総点検する。個別 migration 時の監査は `/database-migration` 内で自動実行されるが、このコマンドは**横断監査**。

## 実行プロトコル

### Step 1: 対象列挙

`supabase/migrations/*.sql` を全て読み、存在するテーブル一覧を作成:
- テーブル名
- カラム
- 既存 RLS ポリシー

### Step 2: rls-auditor エージェント起動

`rls-auditor` エージェント (Task) を起動し、以下の網羅的監査を依頼:

1. **RLS 有効化**: 全テーブルに `alter table ... enable row level security;` が適用されているか
2. **ポリシー網羅**: SELECT / INSERT / UPDATE / DELETE それぞれに必要なポリシーがあるか (不要な操作は policy 不在でもブロックされる)
3. **典型パターン適合**:
   - 本人限定: `auth.uid() = user_id`
   - イベント参加者限定: `entries` の exists サブクエリ
   - マッチ当事者限定: `matches` の OR 条件
   - 匿名許容 (読み取り公開): 明示的に `to anon` を付与しているか
4. **service role 依存**: RLS バイパスが必要な操作が `src/lib/supabase/service.ts` 以外で呼ばれていないか (grep)
5. **トモコイ特有**:
   - `votes` は本人限定 SELECT/INSERT のみ (他参加者に投票先をリークしない)
   - `stamps` は送信者 ID を保存しない
   - `profile_photos` は本人以外アクセス不可、配信は Signed URL 経由のみ
   - `match_messages` はマッチ当事者の 2 人のみ

### Step 3: レポート

以下のフォーマットでユーザーに報告:

```
## RLS 監査結果

### ✅ 問題なし
- <table_name>: RLS 有効 + ポリシー網羅

### ⚠️ 要修正
- <table_name>: <問題の説明>
  - 修正案: <具体的な SQL>

### 🔥 Critical (必須対応)
- <table_name>: <深刻な問題>
  - リスク: <想定される漏洩シナリオ>
  - 修正案: <具体的な SQL>
```

### Step 4: 修正 migration 作成 (必要時)

Critical / 要修正があれば、ユーザー合意の上で修正 migration を追加:
- `supabase/migrations/YYYYMMDDHHMMSS_rls_fix_<table>.sql`
- 既存データへの影響を評価
- rollback SQL もコメントで併記

## 関連

- [.claude/agents/rls-auditor.md](../agents/rls-auditor.md) — エージェント本体
- [.claude/rules/supabase-rls.md](../rules/supabase-rls.md) — RLS パターン
- [.claude/rules/security-tomokoi.md](../rules/security-tomokoi.md) — 機微事項
