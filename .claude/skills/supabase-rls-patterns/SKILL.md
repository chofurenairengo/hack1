---
name: supabase-rls-patterns
description: Supabase Row Level Security の典型パターン集 — 本人限定 / 参加者限定 / マッチ当事者限定 / service role バイパス。新規テーブル追加時や RLS 監査時の参照。
tags: ["supabase", "rls", "postgres", "security", "tomokoi"]
---

# Skill: Supabase RLS パターン集

## 起動タイミング

- `supabase/migrations/*.sql` の作成・変更時
- 新規テーブル追加時
- RLS ポリシーが不十分 / 多すぎと感じたとき
- `/rls-audit` で指摘を受けたとき

## RLS の基本

Supabase (PostgreSQL) の `Row Level Security` はテーブル単位で有効化。有効化後、**ポリシーに合致する行のみ**が SELECT / INSERT / UPDATE / DELETE できる。

```sql
alter table <name> enable row level security;
-- この時点で「どのポリシーにも合致しない」=「全行アクセス不可」になる
-- 必要な操作に対して policy を明示的に追加していく
```

**service role** では RLS がバイパスされる。**`SUPABASE_SERVICE_ROLE_KEY` はサーバ専用**に隔離。

## パターン 1: 本人限定 SELECT / UPDATE

自分の `users` 行や `photo_reveal_consents` など。

```sql
alter table users enable row level security;

create policy "user reads self" on users
  for select to authenticated
  using (auth.uid() = id);

create policy "user updates self" on users
  for update to authenticated
  using (auth.uid() = id)
  with check (auth.uid() = id);
```

## パターン 2: イベント参加者限定 SELECT

イベント中の情報 (slide_decks, events 等)。`entries` テーブルで参加を確認。

```sql
create policy "event participants can read"
  on slide_decks for select to authenticated
  using (
    exists (
      select 1 from entries
      where entries.event_id = slide_decks.event_id
        and entries.user_id = auth.uid()
    )
  );
```

## パターン 3: 投票の本人限定 SELECT/INSERT

他の参加者に投票先を**絶対にリークしない**。

```sql
alter table votes enable row level security;

create policy "voter reads own vote"
  on votes for select to authenticated
  using (auth.uid() = voter_id);

create policy "voter inserts own vote"
  on votes for insert to authenticated
  with check (auth.uid() = voter_id);

-- UPDATE / DELETE は一度投票したら本人でも不可 (policy を追加しない)
-- ただしフェーズが voting の間だけ insert を許可するトリガ等を追加する選択肢もある
```

**注意**: マッチング計算は service role で RLS バイパスして全 votes を読む。

## パターン 4: マッチ当事者限定 (OR 条件)

`matches`, `match_messages` のように 2 人のユーザーが当事者であるケース。

```sql
create policy "match participants read messages"
  on match_messages for select to authenticated
  using (
    exists (
      select 1 from matches m
      where m.id = match_messages.match_id
        and (m.user_a = auth.uid() or m.user_b = auth.uid())
    )
  );

create policy "match participants send messages"
  on match_messages for insert to authenticated
  with check (
    exists (
      select 1 from matches m
      where m.id = match_messages.match_id
        and (m.user_a = auth.uid() or m.user_b = auth.uid())
    )
    and sender_id = auth.uid()
  );
```

## パターン 5: 顔写真 (本人のみ + service role で Signed URL 発行)

```sql
alter table profile_photos enable row level security;

create policy "self reads own photo"
  on profile_photos for select to authenticated
  using (auth.uid() = user_id);

create policy "self inserts own photo"
  on profile_photos for insert to authenticated
  with check (auth.uid() = user_id);

create policy "self deletes own photo"
  on profile_photos for delete to authenticated
  using (auth.uid() = user_id);

-- Storage bucket は private
-- マッチ相手が同意したとき、サーバ Use Case が service role で Signed URL (expiresIn: 600) を発行
```

## パターン 6: 匿名スタンプ (書き込み許可、読み取りは service role のみ)

```sql
alter table stamps enable row level security;

create policy "participants can insert stamp"
  on stamps for insert to authenticated
  with check (
    exists (
      select 1 from entries
      where entries.event_id = stamps.event_id
        and entries.user_id = auth.uid()
    )
  );

-- 読み取りポリシーを作らない = 通常の authenticated では SELECT 不可
-- 分析用の管理者 / service role のみ読める
-- 送信者 ID は保存しない (カラム自体を作らない)
```

## パターン 7: 管理者のみ UPDATE

`events.status` の変更など主催者限定操作。

```sql
create policy "admin updates events"
  on events for update to authenticated
  using (
    exists (
      select 1 from users
      where users.id = auth.uid()
        and users.role = 'admin'
    )
  );
```

## よくあるミス (監査で弾くべき)

- `enable row level security;` を書き忘れる → **全行アクセス可能のまま**
- SELECT ポリシーだけ書いて INSERT を忘れる → アプリが INSERT できない
- `to authenticated` を忘れて `to public` にする → 未ログインユーザが触れる (危険)
- `with check` を忘れて、INSERT/UPDATE の内容を自由に設定できる
- サブクエリで `auth.uid()` の代わりに固定値を書く
- service role 依存の処理をクライアントから呼べる箇所に置く

## 関連

- [.claude/rules/supabase-rls.md](../../rules/supabase-rls.md) — RLS 規約
- [.claude/agents/rls-auditor.md](../../agents/rls-auditor.md) — 監査エージェント
- [.claude/commands/database-migration.md](../../commands/database-migration.md) — migration フロー
- `docs/tech_spec/01_foundation.md` — DB スキーマ全体
