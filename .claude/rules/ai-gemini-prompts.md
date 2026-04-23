---
description: "Gemini 3 Flash 4 役割プロンプト設計 (構成 / コピーライター / 批評 / デザイナー) + JSON Schema 強制 + NG カテゴリ"
globs: ["src/infrastructure/ai/gemini/**/*", "src/application/slide/**/*", "prompts/**/*"]
alwaysApply: true
---

# AI / Gemini 3 Flash プロンプト設計ルール

スライド生成は技術アピール §1.2 の根幹。**単一 Gemini 3 Flash 呼び出しの中で 4 役割 (構成 / コピーライター / 批評 / デザイナー) を分化**し、4 役割の協調を維持する。単一役割で済ませない。

## 必須制約

1. **`responseMimeType: "application/json"` + JSON Schema を必ず指定**。自由出力を受け取らない。
2. **プロンプト内で 4 役割を明示的にロールプレイさせる**:
   - **構成 (Architect)**: 5 枚スライドの骨格設計 (Hook → Episode → Value → Contrast → Invitation)
   - **コピーライター (Copywriter)**: 具体エピソード誘導、原則日本語のみ、容姿・スペック描写禁止
   - **批評 (Critic)**: 公序良俗違反 / 個人情報リスク / NG カテゴリの検知 — **必ず最終段**
   - **デザイナー (Designer)**: レイアウト・色・アイコン選定の記述
3. **批評役がブロックした場合は JSON 内の `blocked: true` + `reason` を返す**。クライアントは差し戻し UI に渡す。
4. **原則日本語のみ**。他言語混入を認めない。
5. **NG カテゴリ**:
   - 容姿描写 (「イケメン」「かわいい」「スタイルがいい」等)
   - スペック列挙 (年収・学歴・職業の序列化)
   - ランキング表現 (「◯位」「最も◯」等)
   - 個人情報 (本名・住所・勤務先の直接記載)
   - 差別的 / 性的な表現

## プロンプト構造テンプレ

```
あなたは 4 名からなる制作チームです。以下の順で協働し、最終出力を JSON Schema に従って返してください。

### 役割 1: 構成 (Architect)
5 枚のスライド骨格を設計する。各スライドに以下のフィールドを持たせる: title, layout, role_focus.

### 役割 2: コピーライター (Copywriter)
各スライドの本文を書く。以下の NG を守る:
- 容姿描写禁止 (イケメン / かわいい / スタイル etc.)
- スペック列挙禁止 (年収 / 学歴を序列化しない)
- ランキング表現禁止
- 原則日本語のみ

### 役割 3: デザイナー (Designer)
各スライドに layout_hint (icon / color_palette / accent_emoji) を付与する。

### 役割 4: 批評 (Critic) — **最終段**
上記 3 役割の出力を監査する。NG を検知したら blocked=true + reason を返す。パスしたら blocked=false.

### 出力 JSON Schema
{
  "slides": [...5 slides...],
  "blocked": boolean,
  "reason": string | null
}
```

## 実装側の責任

- `src/infrastructure/ai/gemini/GeminiSlideGenerator.ts` が Gemini 3 Flash を呼ぶ単一 Adapter
- `responseSchema` を JSON Schema で指定し、パース失敗時は再試行 (最大 2 回、seed 変えて)
- `blocked: true` の場合は Use Case 層で `Result.err("ai_blocked", reason)` を返す
- ログには Gemini の **入力プロンプト + 出力 JSON を構造化保存** (Supabase `slide_generation_logs` テーブル等) — 再現性のため

## テスト

- モック `GeminiClient` でプロンプト構造を検証 (4 役割記述 / JSON Schema / responseMimeType)
- 固定プロンプトに対するゴールデン JSON 出力 (snapshot test)
- NG カテゴリ検出のユニットテスト (容姿描写を含む入力が blocked になる)

## 禁止事項

- **Gemini を単一役割で呼ばない** (コピーライターだけ、等)
- 批評役を省略しない (最終段で必ず通す)
- JSON Schema を外さない (自由文生成を受け取らない)
- `GEMINI_API_KEY` をクライアント側に持ち込まない
- 原則日本語以外の言語出力を許容しない

## 参考

- `docs/tech_spec/02_a_slide.md` — Gemini 連携 + pptxgenjs
- [tomokoi-guardrails.md](tomokoi-guardrails.md) — アワード 3 種 / ランキング禁止
- [security-tomokoi.md](security-tomokoi.md) — API キー隔離
