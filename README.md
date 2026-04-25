# hack1 — トモコイ (Date My Mate JP)

友人紹介型ライブマッチングイベントプラットフォーム。Hack-1 グランプリ 2026 出展作品。

## 開発環境のセットアップ

### 前提条件

- Node.js 20+
- pnpm 9+
- [Supabase CLI](https://supabase.com/docs/guides/cli)

### 手順

npmでsupabaseをインストールした場合は先頭に

```
npx
```

をつける必要がある

```bash
# 依存パッケージのインストール
pnpm install

# 環境変数の設定
cp .env.example .env.local
# .env.local を編集して Supabase プロジェクトの値を設定
# → https://supabase.com/dashboard でプロジェクトの API Settings から取得

# Supabase CLI 認証 (初回のみ)
supabase login

-------------------------------------------------------
# 以下このボックス内はsrc\types\supabase.tsがないときに実行
# ここから

# マイグレーション適用 (初回 or スキーマ変更後)
supabase db push --project-ref yghjqxktjmtnwngjzljq

# 型生成 (スキーマ変更後は都度実行)
supabase gen types typescript --project-id yghjqxktjmtnwngjzljq > src/types/supabase.ts

# ここまで
-------------------------------------------------------

# 開発サーバー起動
pnpm dev
```

> **Note:** このプロジェクトは Supabase クラウドプロジェクトを使う。Docker は不要。

### 主要コマンド

| コマンド             | 内容                                     |
| -------------------- | ---------------------------------------- |
| `pnpm dev`           | 開発サーバー起動 (http://localhost:3000) |
| `pnpm build`         | 本番ビルド                               |
| `pnpm lint`          | ESLint 実行                              |
| `pnpm typecheck`     | TypeScript 型チェック                    |
| `pnpm test`          | ユニット + インテグレーションテスト      |
| `pnpm test:coverage` | カバレッジ付きテスト                     |

### ブランチ戦略

- `main` — 常にデプロイ可能
- `feat/<member>/<topic>` — 機能開発ブランチ (例: `feat/a/slide-gemini-adapter`)

詳細は [CLAUDE.md](./CLAUDE.md) を参照。

---

## Claude Code Pro プランのトークン節約 (ローカル限定・コミット不要)

> Max プランは不要。以下の変更は **ローカルでのみ** 行い、`git add` しないこと。

### 1. `.claude/settings.json` の `MAX_THINKING_TOKENS` を削除

```jsonc
// 削除する行:
"MAX_THINKING_TOKENS": "10000"
```

これだけで 1 ターンあたり最大 **10,000 トークン**削減できる。

### 2. 自分のレーンに無関係な `.claude/rules/` ファイルを削除

全 26 本が毎会話ロードされる。自分のレーンに不要なものをローカルで削除する。

| 削除してよいファイル    | 対象外レーン |
| ----------------------- | ------------ |
| `ai-gemini-prompts.md`  | B / C / D    |
| `vrm-avatar.md`         | A / C / D    |
| `realtime-webrtc.md`    | A / B / D    |
| `matching-algorithm.md` | A / B / C    |

`tomokoi-guardrails.md` / `security-tomokoi.md` / `team-boundaries.md` の 3 本は **残す**。
