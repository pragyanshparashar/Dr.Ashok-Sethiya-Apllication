import dayjs from "@/lib/dayjs";
import { CLINIC_TIMEZONE, SESSIONS, type SessionName } from "@/lib/constants";

/** Today's date in the clinic's own timezone, not the server's. */
export function todayInClinic(): string {
  return dayjs().tz(CLINIC_TIMEZONE).format("YYYY-MM-DD");
}

/**
 * Which session the desk should be looking at right now.
 *
 * Before the evening session starts, staff are working the morning; once the
 * morning has finished, their attention has moved on. Opening on the wrong
 * session would mean the first thing reception does every afternoon is fix
 * the screen.
 */
export function getCurrentSession(): SessionName {
  const now = dayjs().tz(CLINIC_TIMEZONE).format("HH:mm");
  return now < SESSIONS.MORNING.endTime ? "MORNING" : "EVENING";
}
