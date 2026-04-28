import { z } from 'zod';

export const NgCategorySchema = z.enum(['appearance', 'spec', 'harassment']);

export type NgCategory = z.infer<typeof NgCategorySchema>;

export const NG_CATEGORY_LABELS: Record<NgCategory, string> = {
  appearance: '容姿描写',
  spec: 'スペック列挙',
  harassment: 'ハラスメント',
};
