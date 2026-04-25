import 'server-only';
import { GoogleGenAI } from '@google/genai';
import { ok, err } from '@/domain/shared/types/result';
import type { Result } from '@/domain/shared/types/result';
import type {
  AIGeneratorPort,
  SlideGenerationInput,
  SlideGenerationResult,
  AIGeneratorError,
} from '@/application/shared/ports/ai-generator.port';
import { envGemini } from '@/shared/config/env.server';

const MODEL = 'gemini-2.0-flash';
const MAX_RETRIES = 2;

const responseSchema = {
  type: 'object',
  properties: {
    slides: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          slideIndex: { type: 'integer' },
          title: { type: 'string' },
          body: { type: 'string' },
          presenterScript: { type: 'string' },
          layoutHint: {
            type: 'object',
            properties: {
              icon: { type: 'string' },
              colorPalette: { type: 'string' },
              accentEmoji: { type: 'string' },
            },
            required: ['icon', 'colorPalette', 'accentEmoji'],
          },
        },
        required: ['slideIndex', 'title', 'body', 'presenterScript', 'layoutHint'],
      },
      minItems: 5,
      maxItems: 5,
    },
    blocked: { type: 'boolean' },
    reason: { type: 'string', nullable: true },
  },
  required: ['slides', 'blocked', 'reason'],
};

function buildPrompt(input: SlideGenerationInput, seed: number): string {
  return `あなたは以下の4名からなる制作チームです。seed値: ${seed}。以下の順で協働し、最終出力をJSON Schemaに従って返してください。

## 紹介情報
- 紹介者の名前: ${input.presenterName}
- 被紹介者の趣味・特技: ${input.introduceeHobbies}
- 具体エピソード: ${input.introduceeEpisode}

---

### 役割1: 構成 (Architect)
5枚のスライド骨格を設計する。以下の構成で各スライドにrole_focusを割り当てる:
- スライド0: Hook（つかみ・印象的な一言）
- スライド1: Episode（具体エピソード）
- スライド2: Value（被紹介者の魅力・価値）
- スライド3: Contrast（多面的な姿・ギャップ）
- スライド4: Invitation（一緒にいると楽しいこと・一言）

各スライドにtitle（15文字以内）を設計する。

### 役割2: コピーライター (Copywriter)
各スライドのbody（本文・150文字以内）とpresenterScript（登壇者の語りかけトーク・200文字以内）を書く。以下のNGを厳守する:
- 容姿描写禁止（イケメン・かわいい・スタイルがいい等）
- スペック列挙禁止（年収・学歴を序列化しない）
- ランキング表現禁止（○位・最も○等）
- 原則日本語のみ（英数字・絵文字は可）
- 個人情報（本名・住所・勤務先の直接記載）禁止

### 役割3: デザイナー (Designer)
各スライドにlayout_hintを付与する:
- icon: 内容を象徴するアイコン名（例: "heart", "star", "book"）
- colorPalette: テーマカラー（例: "warm-pink", "ocean-blue", "forest-green"）
- accentEmoji: 雰囲気を伝える絵文字1文字

### 役割4: 批評 (Critic) — 必ず最終段
上記3役割の出力を監査する。以下のNGを検知したらblocked=true + reasonを返す。パスしたらblocked=false, reason=null:
- 容姿描写（イケメン・かわいい・スタイル・背が高い等）
- スペック列挙（年収・学歴・職業の序列化）
- ランキング表現（○位・最も○等）
- 個人情報（本名・住所・勤務先）
- 差別的・性的な表現
- 公序良俗違反

JSON Schemaに従い、必ずJSONのみを返してください。説明文は不要です。`;
}

type GeneratedJson = {
  slides: Array<{
    slideIndex: number;
    title: string;
    body: string;
    presenterScript: string;
    layoutHint: { icon: string; colorPalette: string; accentEmoji: string };
  }>;
  blocked: boolean;
  reason: string | null;
};

export class GeminiSlideGenerator implements AIGeneratorPort {
  private readonly client: GoogleGenAI;

  constructor() {
    this.client = new GoogleGenAI({ apiKey: envGemini.GEMINI_API_KEY });
  }

  async generateSlides(
    input: SlideGenerationInput,
  ): Promise<Result<SlideGenerationResult, AIGeneratorError>> {
    const baseSeed = input.seed ?? Math.floor(Math.random() * 100000);

    for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
      const seed = baseSeed + attempt;
      const result = await this.callGemini(input, seed);

      if (result.ok) {
        return result;
      }

      if (result.error.code === 'ai_blocked') {
        return result;
      }
    }

    return err({
      code: 'parse_error',
      message: `Failed to generate slides after ${MAX_RETRIES} attempts`,
    });
  }

  private async callGemini(
    input: SlideGenerationInput,
    seed: number,
  ): Promise<Result<SlideGenerationResult, AIGeneratorError>> {
    try {
      const response = await this.client.models.generateContent({
        model: MODEL,
        contents: [{ role: 'user', parts: [{ text: buildPrompt(input, seed) }] }],
        config: {
          responseMimeType: 'application/json',
          responseSchema,
          temperature: 0.9,
        },
      });

      const text = response.text;
      if (!text) {
        return err({ code: 'parse_error', message: 'Empty response from Gemini' });
      }

      let parsed: GeneratedJson;
      try {
        parsed = JSON.parse(text) as GeneratedJson;
      } catch {
        return err({ code: 'parse_error', message: 'Invalid JSON from Gemini' });
      }

      if (!parsed.slides || parsed.slides.length !== 5) {
        return err({ code: 'parse_error', message: 'Invalid slide count in response' });
      }

      if (parsed.blocked) {
        return err({
          code: 'ai_blocked',
          message: parsed.reason ?? 'Content blocked by safety check',
          reason: parsed.reason ?? undefined,
        });
      }

      return ok({
        slides: parsed.slides.map((s) => ({
          slideIndex: s.slideIndex,
          title: s.title,
          body: s.body,
          presenterScript: s.presenterScript,
          layoutHint: s.layoutHint,
        })),
        blocked: false,
        reason: null,
      });
    } catch (e) {
      const message = e instanceof Error ? e.message : 'Unknown Gemini error';
      if (message.includes('quota') || message.includes('429')) {
        return err({ code: 'quota_exceeded', message });
      }
      return err({ code: 'unknown', message });
    }
  }
}
