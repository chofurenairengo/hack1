import { ok, err } from '@/domain/shared/types/result';
import type { Result } from '@/domain/shared/types/result';
import type {
  SlideDeckRepository,
  SlideDeckRecord,
} from '@/domain/slide/repositories/slide-deck.repository';
import type { DeckId } from '@/shared/types/ids';

export type SubmitForConfirmationError =
  | { readonly code: 'not_found'; readonly message: string }
  | { readonly code: 'invalid_status'; readonly message: string };

export async function submitForConfirmationUseCase(
  deckId: DeckId,
  deps: { repository: SlideDeckRepository },
): Promise<Result<SlideDeckRecord, SubmitForConfirmationError>> {
  const findResult = await deps.repository.findById(deckId);
  if (!findResult.ok) {
    return err({ code: 'not_found', message: findResult.error.message });
  }

  const deck = findResult.value;
  if (deck.status !== 'draft') {
    return err({
      code: 'invalid_status',
      message: `Cannot submit deck in status "${deck.status}". Expected "draft".`,
    });
  }

  const updateResult = await deps.repository.update(deckId, { status: 'pending_introducee' });
  if (!updateResult.ok) {
    return err({ code: 'not_found', message: updateResult.error.message });
  }
  return ok(updateResult.value);
}
