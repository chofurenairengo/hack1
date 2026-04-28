import Link from 'next/link';
import type { SlideDeckRecord } from '@/domain/slide/repositories/slide-deck.repository';

const STATUS_LABELS: Record<string, string> = {
  draft: '下書き',
  pending_introducee: '被紹介者確認待ち',
  pending_organizer: '主催者審査待ち',
  approved: '承認済み',
  rejected: '差し戻し',
};

const STATUS_COLORS: Record<string, string> = {
  draft: 'bg-slate-100 text-slate-700',
  pending_introducee: 'bg-yellow-100 text-yellow-800',
  pending_organizer: 'bg-blue-100 text-blue-800',
  approved: 'bg-green-100 text-green-800',
  rejected: 'bg-red-100 text-red-800',
};

interface SlideCardProps {
  deck: SlideDeckRecord;
}

export function SlideCard({ deck }: SlideCardProps) {
  const label = STATUS_LABELS[deck.status] ?? deck.status;
  const color = STATUS_COLORS[deck.status] ?? 'bg-muted text-muted-foreground';

  return (
    <div className="rounded-xl border border-border bg-card p-4 hover:shadow-md transition-shadow">
      <div className="flex items-center justify-between mb-3">
        <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${color}`}>{label}</span>
        <span className="text-xs text-muted-foreground">
          {deck.updatedAt.toLocaleDateString('ja-JP')}
        </span>
      </div>

      <p className="text-sm text-muted-foreground mb-4">ID: {deck.id.slice(0, 8)}...</p>

      <div className="flex gap-2">
        <Link
          href={`/slides/${deck.id}/edit`}
          className="flex-1 text-center rounded-md border border-border px-3 py-1.5 text-xs font-medium hover:bg-accent transition-colors"
        >
          編集
        </Link>
        {deck.status === 'pending_introducee' && (
          <Link
            href={`/slides/${deck.id}/confirm`}
            className="flex-1 text-center rounded-md bg-primary px-3 py-1.5 text-xs font-medium text-primary-foreground hover:bg-primary/90 transition-colors"
          >
            確認する
          </Link>
        )}
      </div>
    </div>
  );
}
