import { redirect } from 'next/navigation';
import { QuestionForm } from '@/components/features/slide/QuestionForm';
import { asPairId, asEventId } from '@/shared/types/ids';

interface PageProps {
  searchParams: Promise<{ pairId?: string; eventId?: string }>;
}

export default async function NewSlidePage({ searchParams }: PageProps) {
  const params = await searchParams;
  const { pairId, eventId } = params;

  if (!pairId || !eventId) {
    redirect('/slides');
  }

  return (
    <main className="max-w-xl mx-auto px-4 py-8">
      <div className="mb-6">
        <h1 className="text-2xl font-bold">スライドを作成する</h1>
        <p className="text-muted-foreground text-sm mt-1">
          友人の魅力をAIが5枚のスライドにまとめます
        </p>
      </div>

      <div className="rounded-xl border border-border bg-card p-6">
        <QuestionForm pairId={asPairId(pairId)} eventId={asEventId(eventId)} />
      </div>
    </main>
  );
}
