import { ok, err } from '@/domain/shared/types/result';
import type { Result } from '@/domain/shared/types/result';
import type {
  SlideDeckRepository,
  SlideDeckRecord,
} from '@/domain/slide/repositories/slide-deck.repository';
import type { DeckId } from '@/shared/types/ids';

export type ApproveByOrganizerError =
  | { readonly code: 'not_found'; readonly message: string }
  | { readonly code: 'invalid_status'; readonly message: string }
  | { readonly code: 'update_failed'; readonly message: string };

export async function approveByOrganizerUseCase(
  deckId: DeckId,
  deps: { repository: SlideDeckRepository },
): Promise<Result<SlideDeckRecord, ApproveByOrganizerError>> {
  const findResult = await deps.repository.findById(deckId);
  if (!findResult.ok) {
    return err({ code: 'not_found', message: findResult.error.message });
  }

  const deck = findResult.value;
  if (deck.status !== 'pending_organizer') {
    return err({
      code: 'invalid_status',
      message: `Cannot approve deck in status "${deck.status}". Expected "pending_organizer".`,
    });
  }

  const updateResult = await deps.repository.update(deckId, { status: 'approved' });
  if (!updateResult.ok) {
    return err({ code: 'update_failed', message: updateResult.error.message });
  }
  return ok(updateResult.value);
}
