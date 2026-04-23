---
name: /phase0-check
description: Phase 0 (4/13-4/15) 基盤構築の完了チェックリスト — スキーマ / RLS / CI / クロスメンバー型契約を検証する。
---

# /phase0-check

**用途**: Phase 0 (基盤構築、A 単独、4/13-4/15) の完了判定。このチェックが**全て ✅ になるまで Phase 1 に進まない**。

## チェックリスト実行

以下を順に検証し、**すべて ✅ になるまでユーザーに報告**する。

### 1. Next.js プロジェクト健全性

```bash
pnpm install
pnpm build
pnpm tsc --noEmit
pnpm lint
```
- [ ] `pnpm build` が通る
- [ ] `tsc --noEmit` がエラーなし
- [ ] `eslint` が警告のみ (エラーなし)

### 2. ディレクトリ構造

- [ ] `src/domain/` `src/application/` `src/infrastructure/` `src/lib/` `src/types/` が存在
- [ ] `src/domain/matching/` `src/domain/vote/` `src/domain/slide/` `src/domain/match/` の空モジュール (scaffold)
- [ ] `src/lib/supabase/client.ts` `src/lib/supabase/server.ts` `src/lib/supabase/service.ts` が存在し、`server.ts` と `service.ts` の先頭が `import "server-only"`

### 3. クロスメンバー型契約 (A 管轄)

- [ ] `src/types/api.ts` が作成済みで以下を含む
  - `ActionResult<T>` 型
  - 主要エンティティの DTO (`VoteDto`, `SlideDeckDto`, `MatchDto` 等)
- [ ] `src/types/db.ts` が作成済みで `src/types/supabase.ts` からの export / re-export を整理

### 4. Supabase スキーマ + RLS

- [ ] `supabase/migrations/*.sql` に以下のテーブルが全て存在し、**RLS が有効化**されている
  - `users`, `events`, `entries`, `presentation_pairs`, `slide_decks`, `votes`, `recommendations`, `tables`, `table_members`, `matches`, `match_messages`, `photo_reveal_consents`, `profile_photos`, `stamps`, `awards`
- [ ] 各テーブルに最低 1 つの SELECT ポリシー
- [ ] 本人限定 UPDATE が必要なテーブル (users, photo_reveal_consents 等) にポリシー
- [ ] `/rls-audit` を実行して 🔥 Critical なし

### 5. types/supabase.ts

- [ ] `supabase gen types typescript --local > src/types/supabase.ts` で生成済み
- [ ] **手編集痕跡なし** (ファイルヘッダに自動生成コメント)

### 6. Supabase クライアント

- [ ] `src/lib/supabase/client.ts` — `createBrowserClient` + anon key
- [ ] `src/lib/supabase/server.ts` — `createServerClient` (RSC / Route Handler 用)
- [ ] `src/lib/supabase/service.ts` — service role 専用、`"server-only"` import
- [ ] `src/lib/supabase/middleware.ts` — セッション refresh
- [ ] `SUPABASE_SERVICE_ROLE_KEY` がクライアント側 import path に出現しない (grep で検証)

### 7. 認証基盤

- [ ] Supabase Auth 有効化
- [ ] ログイン / ログアウトの最小 UI (`src/app/(auth)/`)
- [ ] middleware でセッション refresh

### 8. CI/CD

- [ ] `.github/workflows/ci.yml` が存在し、以下を実行
  - `pnpm install`
  - `pnpm lint`
  - `pnpm tsc --noEmit`
  - `pnpm test --coverage`
  - `pnpm build`
- [ ] Vercel プロジェクト連携済み (preview deployment が PR で自動生成)
- [ ] Supabase migration が main マージで自動適用される設定 (or Runbook に明記)

### 9. 環境変数

- [ ] `.env.example` が存在し、必要な環境変数が列挙されている
- [ ] Vercel の env に本番 / preview の値が設定済み
- [ ] `src/lib/env.ts` で起動時検証 (未設定ならエラー)

### 10. ドキュメント / Claude Code 設定

- [ ] [CLAUDE.md](../../CLAUDE.md) が最新
- [ ] `.claude/rules/*.md` が docs と整合している
- [ ] `README.md` に開発開始手順が書いてある

## 結果報告フォーマット

```
## Phase 0 Check — YYYY-MM-DD

### ✅ Passed (N / 10)

### ❌ Failed
- <項目>: <理由>
  - 対応: <TODO>

### Phase 1 Readiness
- [ ] B/C/D が自レーンを始められる状態か
```

## 関連

- [.claude/rules/supabase-rls.md](../rules/supabase-rls.md)
- [.claude/rules/team-boundaries.md](../rules/team-boundaries.md)
- `docs/tech_spec/01_foundation.md`
