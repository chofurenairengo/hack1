import { createSupabaseServerClient } from '@/infrastructure/supabase/client-server';
import { AdminNav } from '@/components/features/admin/AdminNav';
import { headers } from 'next/headers';

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

export default async function AdminEventsPage() {
  const supabase = await createSupabaseServerClient();

  const { data: events } = await supabase
    .from('events')
    .select('id, title, phase, mode, scheduled_at, created_at')
    .order('created_at', { ascending: false });

  const headersList = await headers();
  const pathname = headersList.get('x-pathname') ?? '/admin/events';

  return (
    <main className="max-w-4xl mx-auto px-4 py-8">
      <AdminNav currentPath={pathname} />

      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">イベント管理</h1>
      </div>

      {!events || events.length === 0 ? (
        <div className="text-center py-16 text-muted-foreground">イベントがまだありません</div>
      ) : (
        <div className="space-y-4">
          {events.map((event) => (
            <div key={event.id} className="rounded-xl border border-border bg-card p-5">
              <div className="flex items-start justify-between">
                <div>
                  <h2 className="font-semibold text-lg">{event.title}</h2>
                  <p className="text-sm text-muted-foreground mt-0.5">
                    {event.scheduled_at
                      ? new Date(event.scheduled_at).toLocaleString('ja-JP')
                      : '日時未定'}
                  </p>
                </div>
                <div className="flex gap-2">
                  <EventPhaseBadge phase={event.phase} />
                  <span className="text-xs bg-slate-100 text-slate-700 px-2 py-0.5 rounded-full">
                    {event.mode === 'online' ? 'オンライン' : 'オフライン'}
                  </span>
                </div>
              </div>
              <p className="text-xs text-muted-foreground mt-3">ID: {event.id}</p>
            </div>
          ))}
        </div>
      )}
    </main>
  );
}

function EventPhaseBadge({ phase }: { phase: string }) {
  const color = PHASE_COLORS[phase] ?? 'bg-muted text-muted-foreground';
  return (
    <span className={`text-xs px-2 py-0.5 rounded-full ${color}`}>
      {PHASE_LABELS[phase] ?? phase}
    </span>
  );
}
