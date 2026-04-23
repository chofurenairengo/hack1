---
name: /database-migration
description: Supabase スキーマ変更 — migration 追加 + RLS ポリシー同梱 + types 再生成 + rls-auditor 起動。
---

# /database-migration

**用途**: テーブル追加 / カラム追加 / RLS ポリシー変更などのスキーマ変更を伴う作業を開始するときに呼ぶ。**メンバー A 管轄**だが、他メンバーも PR で参加できる。

## 実行プロトコル

### Step 1: 計画

ユーザーに次を確認し、明記:
- 追加/変更するテーブル名
- カラム定義とインデックス
- RLS ポリシー (SELECT / INSERT / UPDATE / DELETE それぞれ)
- 依存する他テーブル (FK)
- データ移行の要否

### Step 2: Migration ファイル作成

`supabase/migrations/YYYYMMDDHHMMSS_description.sql` を作成し、以下を含める:

1. `create table` or `alter table`
2. `alter table <name> enable row level security;` — **必須**
3. `create policy` 複数 (最低でも SELECT 本人限定 + 用途に応じた INSERT/UPDATE)
4. インデックス (`create index` if needed)
5. トリガ / 関数 (necessary only)

**テンプレ参考**: [.claude/rules/supabase-rls.md](../rules/supabase-rls.md)

### Step 3: Supabase local で検証

```bash
supabase db diff
supabase migration list
```

### Step 4: rls-auditor エージェント起動

`rls-auditor` エージェントを呼び、以下を監査:
- すべての新規テーブルに `enable row level security` があるか
- SELECT / INSERT / UPDATE / DELETE のポリシーに抜けがないか
- 本人限定 / 参加者限定 / マッチ当事者限定の典型パターンを満たしているか
- service role で計算が必要な操作 (マッチング等) のみ RLS バイパスを使っているか

### Step 5: types 再生成

```bash
supabase gen types typescript --local > src/types/supabase.ts
```

**`src/types/supabase.ts` を手編集しない**。再生成結果をそのままコミットする。

### Step 6: テスト追加

`tests/rls/` に新規テーブルの RLS 挙動テストを追加:
- 他イベント参加者が SELECT できないこと
- 本人のみ INSERT できること
- service role ではバイパスできること (必要な場合のみ)

### Step 7: Migration CI 確認

- GitHub Actions で `supabase db diff` が PR に反映される
- `pnpm tsc --noEmit` で型が通る
- `pnpm test` で RLS テストが通る

## 禁止事項

- `supabase db reset` を実行しない (`.claude/settings.json` で deny 済み)
- RLS ポリシーを書かずに migration をマージしない
- `src/types/supabase.ts` を手編集しない

## 関連

- [.claude/rules/supabase-rls.md](../rules/supabase-rls.md) — RLS パターン全集
- [.claude/agents/rls-auditor.md](../agents/rls-auditor.md) — 監査エージェント定義
- [.claude/commands/rls-audit.md](rls-audit.md) — 既存テーブル横断監査
