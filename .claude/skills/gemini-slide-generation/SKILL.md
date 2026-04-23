---
name: gemini-slide-generation
description: Gemini 3 Flash での 4 役割プロンプト設計 (構成 / コピーライター / 批評 / デザイナー) と JSON Schema 強制、NG 検知フロー、pptxgenjs 連携。スライド生成機能の実装ガイド。
tags: ["ai", "gemini", "slide", "prompt", "tomokoi"]
---

# Skill: Gemini 3 Flash スライド生成

## 起動タイミング

- `src/infrastructure/ai/gemini/**` の実装・変更時
- プロンプトテンプレートの改善時
- NG カテゴリ検出の挙動調整時
- pptxgenjs 変換の実装時

## コンセプト

**単一 Gemini 3 Flash 呼び出しで 4 役割のロールプレイを実現**。技術アピール §1.2 の根幹。単一役割で済ませない、批評役を最終段に通す。

## 4 役割

| 役割 | 責務 |
|---|---|
| **構成 (Architect)** | 5 枚スライド骨格設計 (Hook → Episode → Value → Contrast → Invitation) |
| **コピーライター (Copywriter)** | 本文起草、具体エピソード誘導、NG カテゴリ遵守 |
| **批評 (Critic)** | **最終段**で NG 検知、blocked フラグ設定 |
| **デザイナー (Designer)** | layout_hint (icon / color_palette / accent_emoji) 付与 |

## プロンプト構造テンプレ

```
あなたは 4 名からなる制作チームです。以下の順で協働し、最終出力を JSON Schema に従って返してください。

### 役割 1: 構成 (Architect)
5 枚のスライド骨格を設計する。各スライドに title, layout, role_focus を持たせる。
- Hook: 被紹介者の第一印象を一文で
- Episode: 具体的な共通体験エピソード
- Value: 被紹介者の内面的な価値 (容姿・スペックではない)
- Contrast: 一般的イメージと本人の意外な側面
- Invitation: 交流への誘い

### 役割 2: コピーライター (Copywriter)
各スライドの本文を書く。以下の NG を守る:
- 容姿描写禁止 (イケメン / かわいい / スタイル etc.)
- スペック列挙禁止 (年収 / 学歴を序列化しない)
- ランキング表現禁止 (◯位 / 最も◯)
- 個人情報禁止 (本名 / 住所 / 勤務先)
- 原則日本語のみ

### 役割 3: デザイナー (Designer)
各スライドに layout_hint を付与する: icon (Feather 系)、color_palette (3 色)、accent_emoji (1 個まで)。

### 役割 4: 批評 (Critic) — 最終段
上記 3 役割の出力を監査する。NG を検知したら blocked=true + reason を返す。パスしたら blocked=false.
監査項目:
- NG カテゴリ違反
- 個人情報露出
- 差別的 / 性的表現
- 公序良俗違反

### 出力 JSON Schema (必須)
{
  "slides": [
    {
      "title": string,
      "body": string,
      "layout": "hook" | "episode" | "value" | "contrast" | "invitation",
      "role_focus": string,
      "layout_hint": { "icon": string, "color_palette": [string, string, string], "accent_emoji": string | null }
    }
  ],
  "blocked": boolean,
  "reason": string | null
}
```

## API 呼び出し設定

```ts
const response = await genai.generateContent({
  model: "gemini-3-flash",
  contents: [{ role: "user", parts: [{ text: PROMPT }] }],
  generationConfig: {
    responseMimeType: "application/json",
    responseSchema: SLIDE_RESPONSE_SCHEMA, // 上記 JSON Schema
    temperature: 0.7,
    maxOutputTokens: 4096,
  },
})
```

- `responseMimeType` は必ず `application/json`
- `responseSchema` で構造を強制
- パース失敗時は最大 2 回リトライ (temperature を微調整して)

## アダプタ実装 (`src/infrastructure/ai/gemini/GeminiSlideGenerator.ts`)

```ts
import "server-only"
import type { AiGeneratorPort, GenerateInput, GenerateResult } from "@/domain/slide/ports"

export class GeminiSlideGenerator implements AiGeneratorPort {
  async generate(input: GenerateInput): Promise<GenerateResult> {
    const prompt = buildPrompt(input)
    const raw = await callGemini(prompt)
    const parsed = parseSlideResponse(raw) // zod
    if (parsed.blocked) return { ok: false, reason: parsed.reason ?? "ai_blocked" }
    return { ok: true, deck: parsed.slides }
  }
}
```

- Port は Domain 層 (`src/domain/slide/ports.ts`)
- Adapter は Infrastructure (依存逆転)
- Use Case (`src/application/slide/GenerateSlideDeck.ts`) は Port を呼ぶ

## ログ

再現性のため、入力プロンプト + 出力 JSON を Supabase `slide_generation_logs` テーブルに構造化保存:

- `input_prompt` (text)
- `output_json` (jsonb)
- `blocked` (bool)
- `reason` (text | null)
- `tokens_input`, `tokens_output`
- `duration_ms`
- `created_at`

## pptxgenjs 連携

スライド確定後、`src/infrastructure/pptx/convertSlideDeckToPptx.ts` で PPTX 生成:

```ts
import pptxgen from "pptxgenjs"

export function convertSlideDeckToPptx(deck: SlideDeck): Buffer {
  const pres = new pptxgen()
  pres.layout = "LAYOUT_WIDE"
  for (const slide of deck.slides) {
    const s = pres.addSlide()
    s.addText(slide.title, { x: 0.5, y: 0.5, w: 9, h: 1, fontFace: "Noto Sans JP", fontSize: 36 })
    s.addText(slide.body, { x: 0.5, y: 1.8, w: 9, h: 4, fontFace: "Noto Sans JP", fontSize: 20 })
    // icon / color_palette / accent_emoji をレンダリング
  }
  return pres.write("nodebuffer") as Promise<Buffer>
}
```

- 日本語フォント `Noto Sans JP` を埋め込み
- PowerPoint / Keynote で開けることを手動確認

## テスト

- プロンプト構造検証: 4 役割の記述 / JSON Schema / responseMimeType を含むか
- モック `GeminiClient` でのゴールデン (固定プロンプト → 固定 JSON)
- NG カテゴリ検出: 容姿描写を含む入力が `blocked: true` を返すか
- pptxgenjs 出力: 5 枚のスライドが正しく生成されるか

## 禁止事項

- Gemini を単一役割で呼ばない
- 批評役を省略しない (最終段で必ず通す)
- JSON Schema を外さない (自由文生成を受け取らない)
- `GEMINI_API_KEY` をクライアント側 (bundle される場所) に import しない
- 原則日本語以外の言語出力を許容しない
- 生成ログに個人情報 (本名等) を残さない (マスキング)

## 関連

- [.claude/rules/ai-gemini-prompts.md](../../rules/ai-gemini-prompts.md)
- [.claude/agents/gemini-prompt-reviewer.md](../../agents/gemini-prompt-reviewer.md)
- `docs/tech_spec/02_a_slide.md`
