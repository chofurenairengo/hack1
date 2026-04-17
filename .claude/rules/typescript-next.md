# TypeScript / Next.js ルール

Next.js (App Router) + React + TypeScript のフロントエンド規約。`technical_spec.md` §2.1 に準拠。

## ディレクトリ構成

- `app/` — Next.js App Router。ページ / レイアウト / route handler
- `components/` — 再利用可能な UI コンポーネント (shadcn/ui 由来を優先)
- `components/ui/` — shadcn/ui 生成物 (手で編集しない、必要なら fork)
- `lib/` — フレームワーク非依存のユーティリティ
- `lib/supabase/` — Supabase クライアント (`client.ts` = ブラウザ, `server.ts` = サーバ, `middleware.ts`)
- `stores/` — Zustand ストア (イベントごとに 1 ファイル)
- `hooks/` — React カスタムフック
- `types/` — 型定義 (`supabase.ts` は自動生成 = 手で編集禁止)

## Server / Client 境界

- デフォルトは Server Component。`"use client"` は**必要な箇所のみ**に付ける
- Realtime / Zustand / framer-motion / Daily.co を使うコンポーネントは Client
- Client から直接 service-role Supabase クライアントを import しない

## スタイリング

- **Tailwind CSS 優先**。インラインスタイルはほぼ使わない
- クラス順序は `@shadcn/tailwind-variants` または `clsx` + `tailwind-merge` で管理
- 長いクラスは `cva` (class-variance-authority) で variant 化する

## framer-motion (Move Hands 体現)

- アニメーションは**意図のあるものだけ**入れる。常時ループする装飾は避ける
- `prefers-reduced-motion` を尊重する
- SMI 可視化のノード/エッジは framer-motion の layout animation で実装

## 状態管理

- 小さい状態は `useState` / `useReducer`
- 複数コンポーネント共有は Zustand。1 ドメイン = 1 ストア
- サーバデータは Supabase クライアント + Realtime subscription。Zustand でキャッシュする際は Realtime イベントで上書きする

## 非同期 / エラー

- `try/catch` で捕捉し、ユーザー向けメッセージに変換する
- サーバログには内部エラーを残し、UI には汎用メッセージを出す
- `sonner` などの Toast で通知する

## フォームとバリデーション

- `react-hook-form` + `zod`
- Zod スキーマはサーバとクライアントで共通化する (`lib/schemas/`)
- Supabase に渡す前に必ず Zod で検証する

## パフォーマンス

- 画像は `next/image` を使う
- 大きなコンポーネントは `next/dynamic` で動的 import
- Suspense 境界で段階的ロードを見せる

## 禁止事項

- `any` / `@ts-ignore` を気軽に使わない。どうしても必要なら `// TODO:` とセットでコメント
- Server Action で service-role キーを露出しない
- `useEffect` に副作用を詰め込みすぎない (3 つ以上の副作用は分割)
