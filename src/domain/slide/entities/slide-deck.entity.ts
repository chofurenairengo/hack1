import type { Result } from '@/domain/shared/types/result';
import { ok, err } from '@/domain/shared/types/result';
import { InvalidStateTransitionError } from '@/domain/shared/errors/invalid-state-transition.error';
import type { SlideStatus } from '@/domain/slide/value-objects/slide-status.vo';
import type { SlideTemplateKey } from '@/domain/slide/value-objects/slide-template.vo';
import type { Slide, SlideField } from '@/domain/slide/entities/slide.entity';
import { updateSlideField } from '@/domain/slide/entities/slide.entity';
import type { DeckId, PairId } from '@/shared/types/ids';

export type SlideDeckProps = Readonly<{
  id: DeckId;
  presentationPairId: PairId;
  templateKey: SlideTemplateKey;
  slides: readonly [Slide, Slide, Slide, Slide, Slide];
  status: SlideStatus;
  aiGeneratedAt: Date | null;
  introduceeConfirmedAt: Date | null;
  organizerApprovedAt: Date | null;
}>;

export type SlideDeck = SlideDeckProps;

const VALID_TRANSITIONS: Partial<Record<SlideStatus, readonly SlideStatus[]>> = {
  draft: ['pending_introducee'],
  pending_introducee: ['pending_organizer', 'draft'],
  pending_organizer: ['approved', 'rejected'],
  rejected: ['pending_introducee'],
};

function canTransition(from: SlideStatus, to: SlideStatus): boolean {
  return VALID_TRANSITIONS[from]?.includes(to) ?? false;
}

export function createSlideDeck(props: SlideDeckProps): SlideDeck {
  if (props.slides.length !== 5) {
    throw new Error('SlideDeck must have exactly 5 slides');
  }
  return Object.freeze({ ...props });
}

export function updateDeckField(
  deck: SlideDeck,
  slideNumber: 0 | 1 | 2 | 3 | 4,
  field: SlideField,
  value: string,
): Result<SlideDeck, never> {
  const updatedSlides = deck.slides.map((s, i) =>
    i === slideNumber ? updateSlideField(s, field, value) : s,
  ) as unknown as [Slide, Slide, Slide, Slide, Slide];

  return ok(Object.freeze({ ...deck, slides: updatedSlides }));
}

export function submitForConfirmation(
  deck: SlideDeck,
): Result<SlideDeck, InvalidStateTransitionError> {
  if (!canTransition(deck.status, 'pending_introducee')) {
    return err(new InvalidStateTransitionError(deck.status, 'pending_introducee'));
  }
  return ok(Object.freeze({ ...deck, status: 'pending_introducee' as const }));
}

export function confirmByIntroducee(
  deck: SlideDeck,
): Result<SlideDeck, InvalidStateTransitionError> {
  if (!canTransition(deck.status, 'pending_organizer')) {
    return err(new InvalidStateTransitionError(deck.status, 'pending_organizer'));
  }
  return ok(
    Object.freeze({
      ...deck,
      status: 'pending_organizer' as const,
      introduceeConfirmedAt: new Date(),
    }),
  );
}

export function requestRevisionByIntroducee(
  deck: SlideDeck,
): Result<SlideDeck, InvalidStateTransitionError> {
  if (!canTransition(deck.status, 'draft')) {
    return err(new InvalidStateTransitionError(deck.status, 'draft'));
  }
  return ok(Object.freeze({ ...deck, status: 'draft' as const }));
}

export function approveByOrganizer(
  deck: SlideDeck,
): Result<SlideDeck, InvalidStateTransitionError> {
  if (!canTransition(deck.status, 'approved')) {
    return err(new InvalidStateTransitionError(deck.status, 'approved'));
  }
  return ok(
    Object.freeze({
      ...deck,
      status: 'approved' as const,
      organizerApprovedAt: new Date(),
    }),
  );
}

export function rejectByOrganizer(deck: SlideDeck): Result<SlideDeck, InvalidStateTransitionError> {
  if (!canTransition(deck.status, 'rejected')) {
    return err(new InvalidStateTransitionError(deck.status, 'rejected'));
  }
  return ok(Object.freeze({ ...deck, status: 'rejected' as const }));
}
