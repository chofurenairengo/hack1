---
description: "Supabase PostgreSQL + RLS の必須規約。migration に RLS 同梱、service role 隔離、types 自動再生成"
globs: ["supabase/**/*", "src/lib/supabase/**/*", "src/infrastructure/supabase/**/*", "src/types/supabase.ts"]
alwaysApply: true
---

# Supabase + Row Level Security ルール

## 大原則

1. **新規テーブル / スキーマ変更の migration には必ず RLS ポリシーを同梱する**。RLS なしの migration を PR に含めない。
2. **`SUPABASE_SERVICE_ROLE_KEY` はサーバ専用**。`src/lib/supabase/server.ts` に隔離する。ブラウザコードは `anon key` のみ使う。
3. **テーブル変更後は `supabase gen types typescript` を実行** → `src/types/supabase.ts` を再生成する。手編集しない。

## Migration ファイル規約

- 命名: `supabase/migrations/YYYYMMDDHHMMSS_description.sql`
- 1 migration = 1 論理変更 (テーブル追加 + インデックス + RLS ポリシーは同一 migration で OK)
- 例:

```sql
-- supabase/migrations/20260413_001_create_votes.sql

create table votes (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null references events(id) on delete cascade,
  voter_id uuid not null references users(id) on delete cascade,
  votee_id uuid not null references users(id) on delete cascade,
  rank int not null check (rank between 1 and 3),
  created_at timestamptz not null default now(),
  unique (event_id, voter_id, votee_id)
);

-- 必ず RLS を有効化
alter table votes enable row level security;

-- 投票者本人のみ INSERT/SELECT できる
create policy "voter can insert own vote"
  on votes for insert to authenticated
  with check (auth.uid() = voter_id);

create policy "voter can select own vote"
  on votes for select to authenticated
  using (auth.uid() = voter_id);

-- マッチング計算は service role でバイパスする想定 (ポリシー不要)
```

## RLS ポリシーの典型パターン

### (a) 本人限定 SELECT / UPDATE

```sql
create policy "self read" on <table> for select to authenticated using (auth.uid() = user_id);
create policy "self update" on <table> for update to authenticated using (auth.uid() = user_id);
```

### (b) イベント参加者限定 SELECT

```sql
create policy "participants only"
  on <table> for select to authenticated
  using (
    exists (
      select 1 from entries
      where entries.event_id = <table>.event_id
        and entries.user_id = auth.uid()
    )
  );
```

### (c) マッチ当事者限定 (両者許可)

```sql
create policy "match participants"
  on match_messages for select to authenticated
  using (
    exists (
      select 1 from matches m
      where m.id = match_messages.match_id
        and (m.user_a = auth.uid() or m.user_b = auth.uid())
    )
  );
```

### (d) service role バイパス (マッチング計算時)

service role でアクセスすれば RLS が無効化される。**この権限はサーバ Use Case (`src/application/matching/ComputeMatching.ts`) 以外で使わない**。

## Supabase Client 分離

- `src/lib/supabase/client.ts` — ブラウザ用 (`createBrowserClient`, `anon` key)
- `src/lib/supabase/server.ts` — サーバ用 (`createServerClient`, RSC / Route Handler 用)
- `src/lib/supabase/service.ts` — **service role 専用** (マッチング計算のみ、`"server-only"` を import)
- `src/lib/supabase/middleware.ts` — Next.js middleware 用 (セッション refresh)

## 禁止事項

- migration に RLS を書かずにマージしない
- `SUPABASE_SERVICE_ROLE_KEY` をクライアント側に持ち込まない (型の上でも)
- `src/types/supabase.ts` を手編集しない
- `supabase db reset` を自動実行しない (`.claude/settings.json` で deny 済み)

## 参考

- [tomokoi-guardrails.md](tomokoi-guardrails.md) — RLS 設計の invariant
- [security-tomokoi.md](security-tomokoi.md) — 投票秘密送信 / 顔写真 10 分 TTL
- `docs/tech_spec/01_foundation.md` — DB スキーマ全体
