import type { DeckId, UserId } from '@/shared/types/ids';

type ReviewId = string & { readonly __brand: 'ReviewId' };

export type ReviewerRole = 'introducee' | 'organizer';

export type ReviewDecision = 'approved' | 'revision_requested' | 'rejected';

export type SlideReviewProps = Readonly<{
  id: ReviewId;
  slideDeckId: DeckId;
  reviewerRole: ReviewerRole;
  reviewerUserId: UserId;
  decision: ReviewDecision;
  reason: string | null;
  createdAt: Date;
}>;

export type SlideReview = SlideReviewProps;

export function createSlideReview(props: SlideReviewProps): SlideReview {
  return Object.freeze({ ...props });
}
