import type { NgCategory } from '@/domain/slide/value-objects/ng-category.vo';
import { NG_WORDS } from '@/shared/constants/ng-words';

export type NgDetectionResult = Readonly<{
  categories: readonly NgCategory[];
  matchedWords: readonly string[];
  hasViolation: boolean;
}>;

export function detectNgCategories(text: string): NgDetectionResult {
  const categories: NgCategory[] = [];
  const matchedWords: string[] = [];

  for (const [category, words] of Object.entries(NG_WORDS) as [NgCategory, readonly string[]][]) {
    for (const word of words) {
      if (text.includes(word)) {
        if (!categories.includes(category)) {
          categories.push(category);
        }
        if (!matchedWords.includes(word)) {
          matchedWords.push(word);
        }
      }
    }
  }

  return {
    categories,
    matchedWords,
    hasViolation: categories.length > 0,
  };
}

export function detectNgInSlides(
  slides: readonly { title: string; body: string; presenterScript: string }[],
): NgDetectionResult {
  const fullText = slides.map((s) => `${s.title} ${s.body} ${s.presenterScript}`).join(' ');

  return detectNgCategories(fullText);
}
