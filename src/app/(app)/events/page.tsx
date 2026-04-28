import { createSupabaseServerClient } from '@/infrastructure/supabase/client-server';

const PHASE_LABELS: Record<string, string> = {
  pre_event: '開催前',
  entry: 'エントリー受付中',
  presentation: 'プレゼン中',
  voting: '投票中',
  intermission: '休憩中',
  mingling: '交流中',
  closing: 'クロージング',
};

const PHASE_COLORS: Record<string, string> = {
  pre_event: 'bg-slate-100 text-slate-700',
  entry: 'bg-blue-100 text-blue-800',
  presentation: 'bg-purple-100 text-purple-800',
  voting: 'bg-yellow-100 text-yellow-800',
  intermission: 'bg-orange-100 text-orange-800',
  mingling: 'bg-green-100 text-green-800',
  closing: 'bg-gray-100 text-gray-600',
};

export default async function EventsPage() {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return null;

  const { data: entries } = await supabase
    .from('entries')
    .select(
      'event_id, entry_type, is_presenter, events(id, title, mode, phase, venue, scheduled_at)',
    )
    .eq('user_id', user.id)
    .order('created_at', { ascending: false });

  const events = (entries ?? [])
    .map((entry) => ({
      ...entry.events,
      entry_type: entry.entry_type,
      is_presenter: entry.is_presenter,
    }))
    .filter((e): e is NonNullable<typeof e> => e !== null);

  return (
    <main className="max-w-4xl mx-auto px-4 py-8">
      <h1 className="text-2xl font-bold mb-6">参加イベント</h1>

      {events.length === 0 ? (
        <div className="text-center py-16 text-muted-foreground">
          <p>参加しているイベントがありません</p>
          <p className="text-sm mt-2">主催者からの招待をお待ちください</p>
        </div>
      ) : (
        <div className="grid gap-4">
          {events.map((event) => (
            <div
              key={event.id}
              className="rounded-xl border border-border bg-card p-5 hover:shadow-sm transition-shadow"
            >
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1 min-w-0">
                  <h2 className="font-semibold text-lg truncate">{event.title}</h2>
                  <p className="text-sm text-muted-foreground mt-0.5">
                    {event.scheduled_at
                      ? new Date(event.scheduled_at).toLocaleString('ja-JP', {
                          year: 'numeric',
                          month: 'long',
                          day: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit',
                        })
                      : '日時未定'}
                  </p>
                  {event.venue && (
                    <p className="text-sm text-muted-foreground mt-0.5">会場: {event.venue}</p>
                  )}
                </div>
                <div className="flex flex-col gap-1.5 items-end shrink-0">
                  <span
                    className={`text-xs px-2 py-0.5 rounded-full ${
                      PHASE_COLORS[event.phase ?? ''] ?? 'bg-muted text-muted-foreground'
                    }`}
                  >
                    {PHASE_LABELS[event.phase ?? ''] ?? event.phase}
                  </span>
                  <span className="text-xs bg-slate-100 text-slate-700 px-2 py-0.5 rounded-full">
                    {event.mode === 'online' ? 'オンライン' : 'オフライン'}
                  </span>
                  <span className="text-xs text-muted-foreground">
                    {event.entry_type === 'audience'
                      ? 'オーディエンス'
                      : event.is_presenter
                        ? '紹介者'
                        : '被紹介者'}
                  </span>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </main>
  );
}
