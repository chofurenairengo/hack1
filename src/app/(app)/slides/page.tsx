import { createSupabaseServerClient } from '@/infrastructure/supabase/client-server';
import { SupabaseSlideDeckRepository } from '@/infrastructure/supabase/repositories/slide-deck.repository';
import { SlideCard } from '@/components/features/slide/SlideCard';
import Link from 'next/link';
import { asEventId } from '@/shared/types/ids';

export default async function SlidesPage() {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const { data: pair } = await supabase
    .from('presentation_pairs')
    .select('id, event_id')
    .eq('presenter_id', user.id)
    .limit(1)
    .single();

  const repository = new SupabaseSlideDeckRepository();
  const findResult = pair ? await repository.findByEvent(asEventId(pair.event_id)) : null;
  const decks = findResult?.ok ? findResult.value : [];

  const myDecks = decks.filter((d) => {
    return pair ? d.pairId === pair.id : false;
  });

  return (
    <main className="max-w-2xl mx-auto px-4 py-8">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">スライド一覧</h1>
        {pair && (
          <Link
            href={`/slides/new?pairId=${pair.id}&eventId=${pair.event_id}`}
            className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 transition-colors"
          >
            新規作成
          </Link>
        )}
      </div>

      {myDecks.length === 0 ? (
        <div className="text-center py-16 text-muted-foreground">
          <p className="mb-4">スライドがまだありません</p>
          {pair && (
            <Link
              href={`/slides/new?pairId=${pair.id}&eventId=${pair.event_id}`}
              className="text-primary hover:underline text-sm"
            >
              最初のスライドを作成する
            </Link>
          )}
        </div>
      ) : (
        <div className="grid gap-4">
          {myDecks.map((deck) => (
            <SlideCard key={deck.id} deck={deck} />
          ))}
        </div>
      )}
    </main>
  );
}
