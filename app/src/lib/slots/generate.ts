import dayjs from "@/lib/dayjs";
import { SlotModel } from "@/models/slot";
import {
  SESSIONS,
  SLOT_DURATION_MINUTES,
  OPD_WEEKDAYS,
  CLINIC_TIMEZONE,
  type SessionName,
} from "@/lib/constants";

/**
 * Build the list of "HH:mm" start times for one session, spaced by
 * SLOT_DURATION_MINUTES. This is pure arithmetic — no database access — so it's
 * cheap to unit test and cheap to preview in a "what would the grid look like"
 * admin screen before committing to the database.
 */
export function buildSessionTimes(session: SessionName): string[] {
  const { startTime, endTime } = SESSIONS[session];
  const start = dayjs(`2000-01-01T${startTime}`);
  const end = dayjs(`2000-01-01T${endTime}`);

  const times: string[] = [];
  for (let t = start; t.isBefore(end); t = t.add(SLOT_DURATION_MINUTES, "minute")) {
    times.push(t.format("HH:mm"));
  }
  return times;
}

/**
 * Create the bookable slot documents for one calendar date.
 *
 * Idempotent and safe to re-run: it uses `insertMany` with `ordered: false`
 * against the unique (date, time) index, so if some slots for this date already
 * exist (e.g. the roster admin regenerating a day), the duplicates are silently
 * skipped rather than erroring the whole batch. Nothing about an already-booked
 * slot is touched.
 *
 * Returns how many new slots were actually created, for the admin UI to report.
 */
export async function generateSlotsForDate(date: string): Promise<number> {
  const weekday = dayjs.tz(date, CLINIC_TIMEZONE).day();
  if (!OPD_WEEKDAYS.includes(weekday)) {
    return 0; // Sunday — emergency referrals only, no bookable OPD slots.
  }

  const docs = (Object.keys(SESSIONS) as SessionName[]).flatMap((session) =>
    buildSessionTimes(session).map((time) => ({
      date,
      time,
      session,
      status: "AVAILABLE" as const,
    })),
  );

  try {
    const result = await SlotModel.insertMany(docs, { ordered: false });
    return result.length;
  } catch (error) {
    // Duplicate-key errors are expected on a re-run; anything else re-throws.
    const err = error as { code?: number; insertedDocs?: unknown[] };
    if (err.code === 11000) return err.insertedDocs?.length ?? 0;
    throw error;
  }
}

/** Generate slots for the next N days — used to keep the booking calendar filled. */
export async function generateSlotsForRange(startDate: string, days: number): Promise<number> {
  let created = 0;
  for (let i = 0; i < days; i++) {
    const date = dayjs.tz(startDate, CLINIC_TIMEZONE).add(i, "day").format("YYYY-MM-DD");
    created += await generateSlotsForDate(date);
  }
  return created;
}
