import type { SlideId } from '@/shared/types/ids';

export type SlideField = 'title' | 'body' | 'presenterScript';

export type SlideLayoutHint = Readonly<{
  icon: string;
  colorPalette: string;
  accentEmoji: string;
}>;

export type SlideProps = Readonly<{
  id: SlideId;
  slideNumber: 0 | 1 | 2 | 3 | 4;
  title: string;
  body: string;
  presenterScript: string;
  layoutHint: SlideLayoutHint;
  imageSlotIds: readonly string[];
  regeneratedAt: Date | null;
}>;

export type Slide = SlideProps;

export function createSlide(props: SlideProps): Slide {
  return Object.freeze({ ...props });
}

export function updateSlideField(slide: Slide, field: SlideField, value: string): Slide {
  return Object.freeze({ ...slide, [field]: value });
}

export function markSlideRegenerated(
  slide: Slide,
  updates: Partial<Pick<Slide, SlideField>>,
): Slide {
  return Object.freeze({
    ...slide,
    ...updates,
    regeneratedAt: new Date(),
  });
}

export function addImageSlot(slide: Slide, imageSlotId: string): Slide {
  return Object.freeze({
    ...slide,
    imageSlotIds: [...slide.imageSlotIds, imageSlotId],
  });
}
