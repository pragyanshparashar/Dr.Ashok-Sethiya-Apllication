import dayjs from "@/lib/dayjs";
import { connectToDatabase } from "@/lib/db/connect";
import { SlotModel } from "@/models/slot";
import { CLINIC_TIMEZONE, OPD_WEEKDAYS, type SessionName } from "@/lib/constants";
import type { DayOption, SlotAvailability } from "@/components/booking/slot-picker";

/**
 * The next N bookable days, skipping Sunday (emergency referrals only).
 *
 * "Today" and "Tomorrow" are spelled out rather than shown as dates — they are
 * the two options most patients pick, and a word is faster to recognise than a
 * number for someone scanning quickly.
 */
export function upcomingDays(count: number): DayOption[] {
  const today = dayjs().tz(CLINIC_TIMEZONE);
  const days: DayOption[] = [];

  for (let offset = 0; days.length < count; offset++) {
    const day = today.add(offset, "day");
    if (!OPD_WEEKDAYS.includes(day.day())) continue;

    days.push({
      date: day.format("YYYY-MM-DD"),
      label:
        offset === 0 ? "Today" : offset === 1 ? "Tomorrow" : day.format("ddd"),
      dayMonth: day.format("D MMM"),
    });
  }
  return days;
}

/**
 * Availability for a set of dates, shaped for the slot picker.
 *
 * A slot counts as bookable only when its status is AVAILABLE — a slot being
 * HELD by someone mid-payment is correctly shown as unavailable, which is the
 * whole point of the hold.
 *
 * Slots already in the past today are filtered out: offering a 10:00 AM
 * appointment at 11:30 AM would be actively misleading.
 */
export async function availabilityForDates(
  dates: string[],
): Promise<Record<string, Record<SessionName, SlotAvailability[]>>> {
  await connectToDatabase();

  const slots = await SlotModel.find(
    { date: { $in: dates } },
    { date: 1, time: 1, session: 1, status: 1 },
  ).sort({ time: 1 });

  const now = dayjs().tz(CLINIC_TIMEZONE);
  const today = now.format("YYYY-MM-DD");
  const currentTime = now.format("HH:mm");

  const result: Record<string, Record<SessionName, SlotAvailability[]>> = {};
  for (const date of dates) {
    result[date] = { MORNING: [], EVENING: [] };
  }

  for (const slot of slots) {
    const isPast = slot.date === today && slot.time <= currentTime;
    result[slot.date]?.[slot.session as SessionName]?.push({
      time: slot.time,
      available: slot.status === "AVAILABLE" && !isPast,
      // A slot that has simply gone by is a different situation from one
      // somebody else booked, and the patient needs to be told which.
      reason: isPast ? "PAST" : slot.status !== "AVAILABLE" ? "TAKEN" : undefined,
    });
  }

  return result;
}
