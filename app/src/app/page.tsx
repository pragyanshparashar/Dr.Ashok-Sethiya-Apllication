import { formatSlotWithSession, formatSlotWindow, formatSessionHours } from "@/lib/time";
import { buildSessionTimes } from "@/lib/slots/generate";

/**
 * Temporary scaffold page proving the design tokens and time formatting work
 * together. Replaced by the real clinic home page next.
 */
export default function Home() {
  const eveningTimes = buildSessionTimes("EVENING");

  return (
    <main className="mx-auto w-full max-w-2xl px-4 py-8 flex flex-col gap-8">
      <header className="flex flex-col gap-2">
        <h1 className="text-headline-lg font-bold text-on-surface">
          Dr. Ashok Sethia
        </h1>
        <p className="text-body-md text-on-surface-variant">
          Senior Consultant Physician &amp; Cardiologist
        </p>
      </header>

      <section className="rounded-card bg-surface-container-lowest p-5 flex flex-col gap-3">
        <h2 className="text-title-lg font-semibold">OPD Hours</h2>
        <dl className="flex flex-col gap-2 text-body-md">
          <div className="flex justify-between gap-4">
            <dt className="text-on-surface-variant">Morning</dt>
            <dd className="tabular font-medium">{formatSessionHours("MORNING")}</dd>
          </div>
          <div className="flex justify-between gap-4">
            <dt className="text-on-surface-variant">Evening</dt>
            <dd className="tabular font-medium">{formatSessionHours("EVENING")}</dd>
          </div>
        </dl>
      </section>

      <section className="flex flex-col gap-3">
        <h2 className="text-title-lg font-semibold">
          Evening slots · {eveningTimes.length} available
        </h2>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
          {eveningTimes.map((time) => (
            <button
              key={time}
              type="button"
              className="tabular min-h-touch rounded-card bg-surface-container-low px-3
                         text-label-lg font-semibold text-on-surface
                         hover:bg-surface-container-high transition-colors"
            >
              {formatSlotWithSession(time, "EVENING").split(" · ")[1]}
            </button>
          ))}
        </div>
      </section>

      <section className="rounded-card bg-primary p-5 text-on-primary flex flex-col gap-1">
        <span className="text-label-md opacity-90">Example token pass</span>
        <span className="text-display-lg font-bold tabular">TOKEN #08</span>
        <span className="text-body-md">{formatSlotWithSession("17:36", "EVENING")}</span>
        <span className="text-body-sm opacity-90 tabular">
          Window: {formatSlotWindow("17:36")}
        </span>
      </section>
    </main>
  );
}
