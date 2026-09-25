"use client";

import { useCallback, useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, Pill } from "@/components/ui/card";
import { WalkInDialog } from "@/components/staff/walk-in-dialog";
import { formatTime12h } from "@/lib/time";
import { SESSIONS, type SessionName } from "@/lib/constants";
import type { QueueEntry, QueueStats } from "@/lib/queue/service";

const VISIT_SHORT: Record<string, string> = {
  FIRST_VISIT: "First visit",
  ROUTINE_FOLLOW_UP: "Follow-up",
  POST_PROCEDURE_REVIEW: "Post-procedure",
  EMERGENCY_TRIAGE: "Urgent",
};

/**
 * The reception desk's working screen.
 *
 * Reception does not read a dashboard; they work a loop — who has arrived, who
 * goes in next, who is finished. So the primary action for each patient sits
 * on their row, and the current patient is pinned at the top rather than being
 * hunted for in a list.
 */
export function QueueBoard({
  date,
  session: initialSession,
  initialQueue,
  initialStats,
}: {
  date: string;
  session: SessionName;
  initialQueue: QueueEntry[];
  initialStats: QueueStats;
}) {
  const [session, setSession] = useState(initialSession);
  const [queue, setQueue] = useState(initialQueue);
  const [stats, setStats] = useState(initialStats);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [walkInOpen, setWalkInOpen] = useState(false);

  const refresh = useCallback(async () => {
    const res = await fetch(`/api/staff/queue?date=${date}&session=${session}`);
    if (!res.ok) return;
    const data = await res.json();
    setQueue(data.queue);
    setStats(data.stats);
  }, [date, session]);

  // The desk must not be looking at a stale queue while a patient stands in
  // front of them. Five seconds is frequent enough to feel live at this scale
  // without needing a socket connection.
  useEffect(() => {
    refresh();
    const timer = setInterval(refresh, 5000);
    return () => clearInterval(timer);
  }, [refresh]);

  async function move(bookingId: string, to: string) {
    setBusyId(bookingId);
    await fetch("/api/staff/transition", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ bookingId, to }),
    });
    await refresh();
    setBusyId(null);
  }

  const inConsultation = queue.find((e) => e.status === "IN_CONSULTATION");
  const waiting = queue.filter((e) => e.status === "ARRIVED");
  const expected = queue.filter((e) => e.status === "CONFIRMED");
  const done = queue.filter((e) => ["COMPLETED", "NO_SHOW", "CANCELLED"].includes(e.status));

  return (
    <div className="flex flex-col gap-5">
      {/* Session switch */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex gap-2">
          {(Object.keys(SESSIONS) as SessionName[]).map((name) => (
            <button
              key={name}
              type="button"
              aria-pressed={session === name}
              onClick={() => setSession(name)}
              className={`min-h-touch rounded-card px-4 text-label-lg font-semibold transition-colors ${
                session === name
                  ? "bg-primary text-on-primary"
                  : "bg-surface-container-low text-on-surface hover:bg-surface-container"
              }`}
            >
              {SESSIONS[name].label}
            </button>
          ))}
        </div>
        <Button onClick={() => setWalkInOpen(true)}>+ Add walk-in patient</Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Stat label="Expected today" value={stats.total} />
        <Stat label="Waiting now" value={stats.waiting} tone={stats.waiting > 0 ? "primary" : undefined} />
        <Stat label="Completed" value={stats.completed} />
        <Stat
          label="Collected"
          value={`₹${(stats.revenuePaise.online + stats.revenuePaise.cash) / 100}`}
          hint={`₹${stats.revenuePaise.online / 100} online · ₹${stats.revenuePaise.cash / 100} cash`}
        />
      </div>

      {/* In the room */}
      <section className="flex flex-col gap-2">
        <h2 className="text-title-lg font-bold">In consultation</h2>
        {inConsultation ? (
          <Card className="flex flex-wrap items-center justify-between gap-4 !bg-primary !text-on-primary">
            <div className="flex items-center gap-4">
              <span className="tabular text-display-lg font-bold leading-none">
                #{inConsultation.tokenNumber}
              </span>
              <div>
                <p className="text-title-lg font-bold">{inConsultation.patientName}</p>
                <p className="text-body-sm opacity-90">
                  {describePatient(inConsultation)}
                </p>
              </div>
            </div>
            <Button
              variant="secondary"
              disabled={busyId === inConsultation.bookingId}
              onClick={() => move(inConsultation.bookingId, "COMPLETED")}
            >
              Complete visit
            </Button>
          </Card>
        ) : (
          <Card className="text-center text-body-md text-on-surface-variant">
            Nobody is with the doctor. Call in the next patient below.
          </Card>
        )}
      </section>

      <QueueSection
        title={`Waiting in clinic (${waiting.length})`}
        entries={waiting}
        empty="Nobody has checked in yet."
        busyId={busyId}
        actions={(entry) => (
          <>
            <Button disabled={busyId === entry.bookingId} onClick={() => move(entry.bookingId, "IN_CONSULTATION")}>
              Call in
            </Button>
            <Button
              variant="secondary"
              disabled={busyId === entry.bookingId}
              onClick={() => move(entry.bookingId, "NO_SHOW")}
            >
              No-show
            </Button>
          </>
        )}
      />

      <QueueSection
        title={`Expected (${expected.length})`}
        entries={expected}
        empty="No further bookings for this session."
        busyId={busyId}
        actions={(entry) => (
          <Button disabled={busyId === entry.bookingId} onClick={() => move(entry.bookingId, "ARRIVED")}>
            Check in
          </Button>
        )}
      />

      {done.length > 0 && (
        <QueueSection
          title={`Finished (${done.length})`}
          entries={done}
          empty=""
          busyId={busyId}
          muted
          actions={() => null}
        />
      )}

      {walkInOpen && (
        <WalkInDialog
          date={date}
          session={session}
          onClose={() => setWalkInOpen(false)}
          onAdded={() => {
            setWalkInOpen(false);
            refresh();
          }}
        />
      )}
    </div>
  );
}

function QueueSection({
  title,
  entries,
  empty,
  actions,
  busyId,
  muted,
}: {
  title: string;
  entries: QueueEntry[];
  empty: string;
  actions: (entry: QueueEntry) => React.ReactNode;
  busyId: string | null;
  muted?: boolean;
}) {
  return (
    <section className="flex flex-col gap-2">
      <h2 className="text-title-lg font-bold">{title}</h2>
      {entries.length === 0 ? (
        empty && (
          <Card className="text-center text-body-md text-on-surface-variant">{empty}</Card>
        )
      ) : (
        <ul className="flex flex-col gap-2">
          {entries.map((entry) => (
            <li key={entry.bookingId}>
              <Card
                className={`flex flex-wrap items-center justify-between gap-4 ${muted ? "opacity-60" : ""}`}
              >
                <div className="flex min-w-0 items-center gap-4">
                  <span className="tabular w-14 shrink-0 text-headline-md font-bold text-primary">
                    #{entry.tokenNumber}
                  </span>
                  <div className="min-w-0">
                    <p className="text-title-md font-semibold">{entry.patientName}</p>
                    <p className="text-body-sm text-on-surface-variant">
                      {describePatient(entry)}
                    </p>
                  </div>
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  {entry.slotTime && (
                    <span className="tabular text-label-lg font-semibold text-on-surface-variant">
                      {formatTime12h(entry.slotTime)}
                    </span>
                  )}
                  {entry.source === "WALK_IN" && <Pill tone="warning">Walk-in</Pill>}
                  {entry.isOverflow && <Pill tone="warning">Over capacity</Pill>}
                  {entry.paymentStatus === "CAPTURED" ? (
                    <Pill tone="success">
                      Paid {entry.paymentMethod === "RAZORPAY_ONLINE" ? "online" : "at desk"}
                    </Pill>
                  ) : (
                    <Pill tone="warning">Unpaid</Pill>
                  )}
                  {entry.status === "NO_SHOW" && <Pill>No-show</Pill>}
                  {actions(entry)}
                </div>
              </Card>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

function Stat({
  label,
  value,
  hint,
  tone,
}: {
  label: string;
  value: string | number;
  hint?: string;
  tone?: "primary";
}) {
  return (
    <Card className="flex flex-col gap-0.5">
      <span className="text-label-lg text-on-surface-variant">{label}</span>
      <span
        className={`tabular text-headline-lg font-bold ${tone === "primary" ? "text-primary" : ""}`}
      >
        {value}
      </span>
      {hint && <span className="text-body-sm text-on-surface-variant">{hint}</span>}
    </Card>
  );
}

function describePatient(entry: QueueEntry): string {
  return [
    entry.patientAge ? `${entry.patientAge} yrs` : null,
    entry.patientGender ? entry.patientGender.toLowerCase() : null,
    VISIT_SHORT[entry.visitCategory] ?? entry.visitCategory,
    entry.patientPhone,
  ]
    .filter(Boolean)
    .join(" · ");
}
