"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { formatTime12h, formatSessionHours } from "@/lib/time";
import { SESSIONS, type SessionName } from "@/lib/constants";

export type SlotAvailability = {
  time: string;
  available: boolean;
  /** Why it cannot be booked — a passed slot reads very differently to a taken one. */
  reason?: "PAST" | "TAKEN";
};

export type DayOption = {
  /** "YYYY-MM-DD" */
  date: string;
  /** "Today", "Tomorrow", or a weekday name. */
  label: string;
  /** "24 Oct" */
  dayMonth: string;
};

/**
 * Session → date → slot, in that order.
 *
 * Session comes first deliberately. Patients think "I want to come in the
 * evening" before they think about a specific minute, and leading with the
 * session also anchors the AM/PM reading of every time shown afterwards —
 * the morning OPD runs past noon, so its later slots say "PM" and would
 * otherwise look like a mistake.
 */
export function SlotPicker({
  days,
  slotsByDate,
}: {
  days: DayOption[];
  slotsByDate: Record<string, Record<SessionName, SlotAvailability[]>>;
}) {
  const [session, setSession] = useState<SessionName>("EVENING");
  const [date, setDate] = useState(days[0]?.date ?? "");
  const [slot, setSlot] = useState<string | null>(null);

  const slots = slotsByDate[date]?.[session] ?? [];
  const availableCount = slots.filter((s) => s.available).length;

  // When the chosen day is unusable, point at the next one that isn't rather
  // than leaving the patient to tap through days hunting for availability.
  const nextDayWithSlots = days
    .slice(days.findIndex((d) => d.date === date) + 1)
    .find((d) => (slotsByDate[d.date]?.[session] ?? []).some((s) => s.available));

  return (
    <div className="flex flex-col gap-6">
      {/* Step 1 — session */}
      <fieldset className="flex flex-col gap-3">
        <legend className="text-label-md font-semibold uppercase tracking-wide text-on-surface-variant">
          Step 1 · Choose a session
        </legend>
        <div className="grid grid-cols-2 gap-3">
          {(Object.keys(SESSIONS) as SessionName[]).map((name) => {
            const selected = session === name;
            return (
              <button
                key={name}
                type="button"
                aria-pressed={selected}
                onClick={() => {
                  setSession(name);
                  setSlot(null);
                }}
                className={`flex min-h-touch flex-col items-center justify-center gap-0.5 rounded-card px-3 py-3 transition-colors ${
                  selected
                    ? "bg-primary text-on-primary"
                    : "bg-surface-container-low text-on-surface hover:bg-surface-container"
                }`}
              >
                <span className="text-title-md font-semibold">
                  {SESSIONS[name].label}
                </span>
                <span className="tabular text-label-md opacity-90">
                  {formatSessionHours(name)}
                </span>
              </button>
            );
          })}
        </div>
      </fieldset>

      {/* Step 2 — date */}
      <fieldset className="flex flex-col gap-3">
        <legend className="text-label-md font-semibold uppercase tracking-wide text-on-surface-variant">
          Step 2 · Choose a day
        </legend>
        <div className="flex gap-2 overflow-x-auto pb-1">
          {days.map((day) => {
            const selected = date === day.date;
            return (
              <button
                key={day.date}
                type="button"
                aria-pressed={selected}
                onClick={() => {
                  setDate(day.date);
                  setSlot(null);
                }}
                className={`flex min-h-touch min-w-[5.5rem] shrink-0 flex-col items-center justify-center rounded-card px-3 py-2 transition-colors ${
                  selected
                    ? "bg-primary text-on-primary"
                    : "bg-surface-container-low text-on-surface hover:bg-surface-container"
                }`}
              >
                <span className="text-label-md opacity-90">{day.label}</span>
                <span className="tabular text-title-md font-semibold">
                  {day.dayMonth}
                </span>
              </button>
            );
          })}
        </div>
      </fieldset>

      {/* Step 3 — slot */}
      <fieldset className="flex flex-col gap-3">
        <legend className="flex flex-wrap items-baseline justify-between gap-2 text-label-md font-semibold uppercase tracking-wide text-on-surface-variant">
          <span>Step 3 · Choose a time</span>
          <ScarcityNote count={availableCount} />
        </legend>

        {slots.length === 0 || availableCount === 0 ? (
          <EmptySession
            session={session}
            allPast={slots.length > 0 && slots.every((s) => s.reason === "PAST")}
            hasSlots={slots.length > 0}
            onPickNextDay={nextDayWithSlots ? () => {
              setDate(nextDayWithSlots.date);
              setSlot(null);
            } : undefined}
            nextDayLabel={nextDayWithSlots?.label}
          />
        ) : (
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
            {slots.map(({ time, available }) => {
              const selected = slot === time;
              return (
                <button
                  key={time}
                  type="button"
                  disabled={!available}
                  aria-pressed={selected}
                  aria-label={
                    available
                      ? `${formatTime12h(time)}, ${SESSIONS[session].label}`
                      : `${formatTime12h(time)}, already booked`
                  }
                  onClick={() => setSlot(time)}
                  className={`tabular min-h-touch rounded-card px-2 text-label-lg font-semibold transition-colors ${
                    !available
                      ? "cursor-not-allowed bg-surface-container text-outline line-through"
                      : selected
                        ? "bg-primary text-on-primary"
                        : "bg-surface-container-low text-on-surface hover:bg-surface-container-high"
                  }`}
                >
                  {formatTime12h(time)}
                </button>
              );
            })}
          </div>
        )}
      </fieldset>

      <Button size="lg" disabled={!slot} className="w-full">
        {slot
          ? `Continue · ${SESSIONS[session].label} · ${formatTime12h(slot)}`
          : "Select a time to continue"}
      </Button>
    </div>
  );
}

/**
 * What to show when a session cannot be booked on the chosen day.
 *
 * Rendering fifteen struck-through times is noise — the patient cannot act on
 * any of them. One clear sentence plus a route to the next available day is
 * more useful, and the wording distinguishes a session that has already ended
 * from one that genuinely sold out.
 */
function EmptySession({
  session,
  allPast,
  hasSlots,
  onPickNextDay,
  nextDayLabel,
}: {
  session: SessionName;
  allPast: boolean;
  hasSlots: boolean;
  onPickNextDay?: () => void;
  nextDayLabel?: string;
}) {
  const name = SESSIONS[session].sentenceName;
  const message = !hasSlots
    ? `There is no ${name} on this day.`
    : allPast
      ? `Today's ${name} has already finished.`
      : `The ${name} is fully booked on this day.`;

  return (
    <div className="flex flex-col items-center gap-4 rounded-card bg-surface-container-low px-4 py-8 text-center">
      <p className="text-body-md text-on-surface-variant">{message}</p>
      {onPickNextDay && nextDayLabel && (
        <Button variant="secondary" onClick={onPickNextDay}>
          See {nextDayLabel}
        </Button>
      )}
    </div>
  );
}

/**
 * Scarcity is shown only when it is genuinely low. Displaying "12 slots left"
 * on a quiet day is noise; "Only 2 left" is information a patient acts on.
 */
function ScarcityNote({ count }: { count: number }) {
  if (count === 0) return null;
  if (count <= 3) {
    return (
      <span className="text-label-md font-semibold text-tertiary">
        Only {count} left
      </span>
    );
  }
  return (
    <span className="text-label-md font-normal normal-case text-on-surface-variant">
      {count} available
    </span>
  );
}
