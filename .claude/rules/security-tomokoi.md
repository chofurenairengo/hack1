---
description: "トモコイ特化セキュリティ — 投票秘密送信 / 顔写真 10 分 TTL 署名 URL / service role 隔離 / エラーメッセージ"
globs: ["src/**/*", "supabase/**/*", "!**/*.test.*"]
alwaysApply: true
---

# Security — トモコイ特化

`~/.claude/rules/common/security.md` と `~/.claude/rules/typescript/security.md` の汎用ルールを継承し、**プロジェクト特有の機微事項**を追加する。

## シークレット管理

- **コミット禁止**: `.env*` は `.gitignore` 済み、`.claude/settings.json` の `deny` にも `Write(./**/.env*)` を入れている
- サーバ専用キーの隔離:
  - `SUPABASE_SERVICE_ROLE_KEY` — `src/lib/supabase/service.ts` に隔離、冒頭 `import "server-only"`
  - `GEMINI_API_KEY` — `src/infrastructure/ai/gemini/` のみ、同じく `server-only`
  - `RESEND_API_KEY` — `src/infrastructure/mail/` のみ、同じく `server-only`
- 起動時検証: サーバ起動時に必須 env が未設定なら throw して落とす (`src/lib/env.ts`)

## 投票の秘密送信

- `votes` テーブルは **RLS で本人のみ SELECT/INSERT** 可能
- マッチング計算は **service role で RLS バイパス**して実行 (サーバ専用)
- 集計前の投票内容を他参加者に見せる API を**一切作らない**
- Client 側で「誰が誰に投票したか」が推測できる UI を置かない

## 顔写真の取り扱い

- アップロード先: Supabase Storage のプライベートバケット (`profile-photos`)
- クライアントへの配信は **10 分 TTL の Signed URL** のみ (`createSignedUrl({ expiresIn: 600 })`)
- マッチ成立 + 双方同意したときのみ `photo_reveal_consents.state = "consented"` に更新
- 同意前の顔写真を相手に渡さない (型レベル + RLS の二重防御)
- Signed URL を**長期 TTL で発行しない** (漏洩時の影響を最小化)

## 認証 / 認可

- Supabase Auth を使う (メール + Magic Link)
- 未成年 (18 歳未満) の参加を想定しない (利用規約 + 登録フォームで年齢確認)
- 主催者権限は `users.role = "admin"` で管理、RLS で分離

## エラーメッセージ

- UI には**ユーザー向けの汎用メッセージ**のみ出す (例: 「処理に失敗しました」)
- **スタックトレース / 内部 ID / SQL 断片を露出しない**
- サーバログには詳細を構造化ログで残す (`src/lib/logger.ts`)
- `ActionResult<T>` の `error` フィールドは識別子 (`invalid_input`, `forbidden` 等) のみ

## CSRF / XSS

- Next.js の Server Action はデフォルトで CSRF 保護されている — **独自実装で緩めない**
- ユーザー入力を `dangerouslySetInnerHTML` に渡さない。Markdown は `remark-rehype` + サニタイズ
- shadcn/ui の入力コンポーネントをそのまま使う (独自実装でエスケープを忘れない)

## レート制限

- Realtime Broadcast のスタンプ / 投票は**クライアント側 throttle** (1/sec 等) に加えて、サーバ側でも**時間窓制限**をかける
- Gemini API 呼び出しも同様 (ユーザーごとに 1 min 3 回など)

## 禁止事項

- `SUPABASE_SERVICE_ROLE_KEY` をクライアントに届く経路に書かない (`NEXT_PUBLIC_*` や client.ts 経由)
- 投票内容を集計前に公開しない
- 顔写真を長期 TTL で配信しない
- エラーメッセージに内部情報を露出しない
- 依存パッケージを `npm audit` の high/critical を無視して追加しない

## 参考

- [tomokoi-guardrails.md](tomokoi-guardrails.md) — 投票秘密送信 / 顔写真
- [supabase-rls.md](supabase-rls.md) — RLS パターン
- `docs/tomokoi_spec_v5_3.md` §セキュリティ
