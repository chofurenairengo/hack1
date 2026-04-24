---
description: 'Next.js 16 App Router 特化ルール (Server/Client 境界、Server Action、Supabase クライアント分離、shadcn/ui、framer-motion)'
globs: ['src/**/*.ts', 'src/**/*.tsx', 'app/**/*.ts', 'app/**/*.tsx']
alwaysApply: true
---

# Next.js 16 App Router ルール

`~/.claude/rules/typescript/*` の汎用 TypeScript ルールを継承し、**Next.js 16 App Router + Supabase** 固有の追加規約を定める。

## ディレクトリ構成

- `src/app/` — App Router (Server Component デフォルト、route handler、layout)
- `src/components/ui/` — shadcn/ui 生成物 (**手編集禁止**、fork が必要なら別パス)
- `src/components/features/` — 機能別 UI
- `src/domain/` — ドメイン層 (他層 import **禁止**、純粋 TypeScript)
- `src/application/` — Use Case (Domain のみ依存)
- `src/infrastructure/` — Repository 実装 + Adapter (Supabase / Gemini / VRM / WebRTC)
- `src/lib/` — フレームワーク非依存ユーティリティ
- `src/lib/supabase/` — `client.ts` (ブラウザ) / `server.ts` (サーバ, service role 隔離) / `middleware.ts`
- `src/stores/` — Zustand (1 ドメイン = 1 ファイル)
- `src/hooks/` — React カスタムフック
- `src/types/supabase.ts` — `supabase gen types` 自動生成 (**手編集禁止**)
- `src/types/api.ts` — クロスメンバー型契約 (メンバー B（PM）管轄)

## Server / Client 境界

- **デフォルトは Server Component**。`"use client"` は必要な箇所 (Realtime / Zustand / framer-motion / WebRTC / VRM) のみに付ける。
- Client Component から **直接 service-role Supabase クライアントを import しない**。型レベルでも `src/lib/supabase/server.ts` に限定する。
- Server Component からしか呼べない関数は `server-only` パッケージで明示する。

## Server Action 規約

```ts
'use server';
import { z } from 'zod';
import type { ActionResult } from '@/types/api';

const schema = z.object({
  /* ... */
});

export async function doSomething(input: unknown): Promise<ActionResult<T>> {
  const parsed = schema.safeParse(input);
  if (!parsed.success) return { ok: false, error: 'invalid_input' };
  // Use Case を 1 つだけ呼ぶ。DB アクセスや外部 API 呼び出しを直接書かない
  return await someUseCase(parsed.data);
}
```

- 先頭は必ず `"use server"`
- 入力は `zod` で検証、失敗は `{ ok: false, error }`
- Use Case 1 個だけ呼ぶ (複数 Use Case を跨ぐ処理は Application 層で合成する)
- 戻り値は `ActionResult<T>` で統一

## スタイリング

- **Tailwind CSS v4 優先**。インラインスタイルはほぼ使わない
- クラス合成は `clsx` + `tailwind-merge` (または `cva` for variants)
- 長いクラスは `cva` (class-variance-authority) で variant 化

## framer-motion (Move Hands 体現)

- アニメーションは**意図のあるものだけ**。常時ループする装飾は避ける
- `prefers-reduced-motion` を尊重する
- マッチング可視化のノード / エッジは `layout` アニメーションを検討

## 状態管理

- 小さな状態: `useState` / `useReducer`
- 複数コンポーネント共有: **Zustand** (1 ドメイン = 1 ストア)
- サーバデータ: Supabase client + Realtime subscription。Zustand キャッシュは Realtime イベントで上書き

## フォームとバリデーション

- `react-hook-form` + `zod`
- Zod スキーマはサーバとクライアントで共通 (`src/lib/schemas/`)
- Supabase に渡す前に必ず Zod で検証

## パフォーマンス

- 画像は `next/image`
- 大きなコンポーネントは `next/dynamic` で動的 import
- Suspense 境界で段階的ロード

## 禁止事項

- `any` / `@ts-ignore` を気軽に使わない (必要なら `// TODO:` と理由を併記)
- Server Action で `SUPABASE_SERVICE_ROLE_KEY` を露出しない
- `useEffect` に副作用を 3 つ以上詰め込まない (分割する)
- `src/domain/` から `next/*` / `@supabase/*` を import しない (ドメインを汚染しない)
- `src/types/supabase.ts` を手編集しない (再生成する)
