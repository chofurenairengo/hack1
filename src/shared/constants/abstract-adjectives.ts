export const ABSTRACT_ADJECTIVES = [
  '優しい',
  '面白い',
  'おもしろい',
  'いい人',
  'いいひと',
  '素敵',
  'すてき',
  '素晴らしい',
  'すばらしい',
  '明るい',
  '元気',
  'げんき',
  '楽しい',
  'たのしい',
  '気さく',
  'きさく',
  'フレンドリー',
  '温かい',
  'あたたかい',
  '誠実',
  'せいじつ',
  '真面目',
  'まじめ',
  '頼りになる',
  'たよりになる',
  'かっこいい',
  'かわいい',
  'かわいらしい',
  'ポジティブ',
  '前向き',
  'まえむき',
  '感じがいい',
  '雰囲気がいい',
] as const;

export type AbstractAdjective = (typeof ABSTRACT_ADJECTIVES)[number];

export function detectAbstractAdjectives(text: string): string[] {
  return ABSTRACT_ADJECTIVES.filter((adj) => text.includes(adj));
}
