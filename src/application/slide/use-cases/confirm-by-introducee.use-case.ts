import { ok, err } from '@/domain/shared/types/result';
import type { Result } from '@/domain/shared/types/result';
import type {
  SlideDeckRepository,
  SlideDeckRecord,
} from '@/domain/slide/repositories/slide-deck.repository';
import type { DeckId } from '@/shared/types/ids';

export type ConfirmByIntroduceeInput = {
  readonly deckId: DeckId;
  readonly decision: 'approve' | 'revision';
};

export type ConfirmByIntroduceeError =
  | { readonly code: 'not_found'; readonly message: string }
  | { readonly code: 'invalid_status'; readonly message: string }
  | { readonly code: 'update_failed'; readonly message: string };

export async function confirmByIntroduceeUseCase(
  input: ConfirmByIntroduceeInput,
  deps: { repository: SlideDeckRepository },
): Promise<Result<SlideDeckRecord, ConfirmByIntroduceeError>> {
  const findResult = await deps.repository.findById(input.deckId);
  if (!findResult.ok) {
    return err({ code: 'not_found', message: findResult.error.message });
  }

  const deck = findResult.value;
  if (deck.status !== 'pending_introducee') {
    return err({
      code: 'invalid_status',
      message: `Cannot confirm deck in status "${deck.status}". Expected "pending_introducee".`,
    });
  }

  const nextStatus = input.decision === 'approve' ? 'pending_organizer' : 'draft';
  const updateResult = await deps.repository.update(input.deckId, { status: nextStatus });
  if (!updateResult.ok) {
    return err({ code: 'update_failed', message: updateResult.error.message });
  }
  return ok(updateResult.value);
}
