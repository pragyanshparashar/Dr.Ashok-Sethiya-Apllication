import { QueueBoard } from "@/components/staff/queue-board";
import { getQueue, getQueueStats } from "@/lib/queue/service";
import { getCurrentSession, todayInClinic } from "@/lib/clinic-time";
import { CLINIC } from "@/lib/clinic";

export const dynamic = "force-dynamic";

export default async function StaffPage() {
  const date = todayInClinic();
  const session = getCurrentSession();

  const [queue, stats] = await Promise.all([
    getQueue(date, session),
    getQueueStats(date, session),
  ]);

  return (
    <>
      <header className="border-b border-outline-variant/40 bg-surface-container-lowest">
        <div className="mx-auto flex w-full max-w-6xl flex-wrap items-center justify-between gap-3 px-4 py-3">
          <div>
            <h1 className="text-title-lg font-bold text-primary">Reception desk</h1>
            <p className="text-label-lg text-on-surface-variant">{CLINIC.name}</p>
          </div>
          <p className="tabular text-label-lg font-semibold text-on-surface-variant">{date}</p>
        </div>
      </header>

      <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-5">
        <QueueBoard date={date} session={session} initialQueue={queue} initialStats={stats} />
      </main>
    </>
  );
}
