# CLAUDE.md

## Project

**Hack-1 グランプリ 2026 — 友人紹介型マッチングイベントプラットフォーム (Date My Mate JP)**
オンラインコア型ハイブリッドの友人紹介マッチングイベント基盤。最終発表 2026-05-10 (オフライン・東大福武ホール)。審査コンセプトは **Move Hands. Move Hearts.**

## Tech Stack

- **Frontend**: Next.js (App Router) + React / Tailwind CSS + shadcn/ui + framer-motion / Zustand / PWA
- **Backend**: Supabase (PostgreSQL + Realtime + Row Level Security)
- **AI**: OpenAI GPT-4o-mini × 4 エージェント (構成 / コピーライター / 批評 / デザイナー)
- **Matching**: Python 自前実装 SMI 拡張 (男女比均等化ハード制約 + Min-Regret Sum)
- **Video**: Daily.co または LiveKit (交流タイムのみ)

## Documentation References

> **Docs Sync Rule**: `docs/` 配下の `.md` ファイルが追加・削除・改名された場合、必ず本セクションを更新する。各ファイルの先頭 H1 / 冒頭要約を説明文として流用すること。

- [docs/requirements.md](docs/requirements.md) — 要件定義書 (プロダクト概要・参加枠・UXフロー・ビジネスモデル)
- [docs/technical_spec.md](docs/technical_spec.md) — 技術仕様書 (技術3軸・スタック・DBスキーマ・開発ロードマップ)

## Workflow Pointers

- 新機能 / 大きな変更: [`/feature-development`](.claude/commands/feature-development.md)
- スキーマ変更 / マイグレーション: [`/database-migration`](.claude/commands/database-migration.md)
- 常時遵守: [.claude/rules/hack1-guardrails.md](.claude/rules/hack1-guardrails.md), [typescript-next.md](.claude/rules/typescript-next.md), [python-smi.md](.claude/rules/python-smi.md)
- プロジェクト全体像: [.claude/skills/hack1/SKILL.md](.claude/skills/hack1/SKILL.md)

## 絶対に守ること (抜粋 — 詳細は `rules/`)

1. Supabase Row Level Security を**必ず**併せて変更する。RLS なしのスキーマ変更は PR を出さない。
2. マッチング入力は **Votes テーブルのみ**。`Recommendations` (推薦フラグ) は UI 表示専用でアルゴリズムに渡さない。
3. SMI アルゴリズム変更時は先にテストを書く (TDD)。Min-Regret Sum と男女比均等化の境界値は固定ケースで必ず検証。
4. スライド生成は単一 LLM 呼び出しで代替しない。4 エージェント協調を維持する。
5. Offline-first を壊す変更を禁止 — ネットワーク断絶時も進行できる設計を維持。
6. アワードは「おもしろい」「盛り上がった」「友情」の 3 種のみ。「異性から人気◯位」系は追加しない。
