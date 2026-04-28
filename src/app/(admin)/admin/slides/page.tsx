import { createSupabaseServerClient } from '@/infrastructure/supabase/client-server';
import { SupabaseSlideDeckRepository } from '@/infrastructure/supabase/repositories/slide-deck.repository';
import { AdminNav } from '@/components/features/admin/AdminNav';
import { AdminSlideItem } from '@/components/features/admin/AdminSlideItem';
import { headers } from 'next/headers';
import { asEventId } from '@/shared/types/ids';

export default async function AdminSlidesPage() {
  const supabase = await createSupabaseServerClient();

  const { data: events } = await supabase
    .from('events')
    .select('id')
    .order('created_at', { ascending: false })
    .limit(1);

  const eventId = events?.[0]?.id;
  const repository = new SupabaseSlideDeckRepository();

  const eventResult = eventId ? await repository.findByEvent(asEventId(eventId)) : null;
  const allDecks = eventResult?.ok ? eventResult.value : [];

  const pendingDecks = allDecks.filter((d) => d.status === 'pending_organizer');

  const headersList = await headers();
  const pathname = headersList.get('x-pathname') ?? '/admin/slides';

  return (
    <main className="max-w-4xl mx-auto px-4 py-8">
      <AdminNav currentPath={pathname} />

      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">スライド審査</h1>
        <span className="text-sm text-muted-foreground">審査待ち: {pendingDecks.length}件</span>
      </div>

      {pendingDecks.length === 0 ? (
        <div className="text-center py-16 text-muted-foreground">
          審査待ちのスライドはありません
        </div>
      ) : (
        <div className="space-y-8">
          {pendingDecks.map((deck) => (
            <AdminSlideItem key={deck.id} deck={deck} />
          ))}
        </div>
      )}
    </main>
  );
}
