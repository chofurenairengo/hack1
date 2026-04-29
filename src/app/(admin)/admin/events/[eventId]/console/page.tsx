import { redirect } from 'next/navigation';
import { getActivePhaseAction } from '@/app/actions/event/get-active-phase';
import { PhaseSwitcher } from '@/components/features/event/PhaseSwitcher';
import { ParticipantCounter } from '@/components/features/event/ParticipantCounter';
import { RealtimeLog } from '@/components/features/event/RealtimeLog';
import { asEventId } from '@/shared/types/ids';

type Props = {
  params: Promise<{ eventId: string }>;
};

export default async function ConsolePage({ params }: Props) {
  const { eventId: rawId } = await params;

  const result = await getActivePhaseAction({ eventId: rawId });
  if (!result.ok) {
    redirect('/admin/events');
  }

  const eventId = asEventId(rawId);

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="mx-auto max-w-4xl">
        <header className="mb-8">
          <h1 className="text-2xl font-bold text-gray-900">管理者コンソール</h1>
          <p className="mt-1 text-sm text-gray-500">イベント ID: {rawId}</p>
        </header>

        <div className="grid gap-6 md:grid-cols-2">
          <div className="md:col-span-2">
            <PhaseSwitcher
              eventId={eventId}
              initialPhase={result.data.phase}
              initialRound={1}
            />
          </div>

          <ParticipantCounter eventId={eventId} />
          <RealtimeLog eventId={eventId} />
        </div>
      </div>
    </div>
  );
}
