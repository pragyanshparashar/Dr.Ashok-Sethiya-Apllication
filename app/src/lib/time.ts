import { SESSIONS, SLOT_DURATION_MINUTES, type SessionName } from "@/lib/constants";

/**
 * Time formatting for the clinic.
 *
 * Times are STORED as 24-hour "HH:mm" because that sorts correctly, compares
 * correctly, and is unambiguous in code. They are never SHOWN that way.
 *
 * Patients here are largely 55–75 years old and read 12-hour time. Worse,
 * the morning OPD runs until 1:00 PM, so its final slots legitimately fall
 * after noon and display as "12:36 PM" — which looks like a contradiction to
 * someone who booked a *morning* appointment. Every patient-facing time is
 * therefore paired with its session name, so "PM" can never be read as
 * "evening" by mistake.
 */

/** "17:36" → "5:36 PM". Display only — never store this form. */
export function formatTime12h(hhmm: string): string {
  const [hours, minutes] = hhmm.split(":").map(Number);
  const period = hours < 12 ? "AM" : "PM";
  const hour12 = hours % 12 || 12;
  return `${hour12}:${String(minutes).padStart(2, "0")} ${period}`;
}

/**
 * The full, unambiguous form for a token pass or confirmation screen:
 * "Morning OPD · 12:36 PM". The session prefix is what stops a patient
 * reading the "PM" on a morning appointment as an evening one.
 */
export function formatSlotWithSession(hhmm: string, session: SessionName): string {
  return `${SESSIONS[session].label} · ${formatTime12h(hhmm)}`;
}

/**
 * The consultation window, e.g. "5:36 – 5:48 PM".
 *
 * The period is printed once when both ends share it, which reads more
 * naturally, but repeated across the noon boundary ("11:48 AM – 12:00 PM")
 * where dropping it would be genuinely misleading.
 */
export function formatSlotWindow(hhmm: string): string {
  const [hours, minutes] = hhmm.split(":").map(Number);
  const endTotal = hours * 60 + minutes + SLOT_DURATION_MINUTES;
  const end = `${String(Math.floor(endTotal / 60)).padStart(2, "0")}:${String(endTotal % 60).padStart(2, "0")}`;

  const startPeriod = hours < 12 ? "AM" : "PM";
  const endPeriod = Math.floor(endTotal / 60) < 12 ? "AM" : "PM";

  if (startPeriod === endPeriod) {
    return `${formatTime12h(hhmm).replace(` ${startPeriod}`, "")} – ${formatTime12h(end)}`;
  }
  return `${formatTime12h(hhmm)} – ${formatTime12h(end)}`;
}

/** Session operating hours for display: "10:00 AM – 1:00 PM". */
export function formatSessionHours(session: SessionName): string {
  const { startTime, endTime } = SESSIONS[session];
  return `${formatTime12h(startTime)} – ${formatTime12h(endTime)}`;
}
