/**
 * Domain constants for the clinic.
 *
 * Everything here is deliberately explicit rather than inferred, because these
 * values describe a real clinic's operating rules and someone non-technical
 * may need to read and confirm them.
 */

/** The clinic operates entirely in Indian Standard Time. */
export const CLINIC_TIMEZONE = "Asia/Kolkata";

/** Consultation fee, stored in paise to avoid floating-point money bugs. */
export const CONSULTATION_FEE_PAISE = 50_000; // ₹500.00

/**
 * How long a slot is held for a patient once they commit to paying.
 *
 * Ten minutes rather than five: card 3-D Secure and netbanking routinely take
 * 3–8 minutes in India, and this clinic's patients are largely 55–75 years old.
 * Cutting off a genuine payer mid-transaction costs a refund and an upset
 * patient; holding a slot slightly longer costs almost nothing.
 */
export const SLOT_LOCK_MINUTES = 10;

/** Each consultation occupies one 12-minute slot. */
export const SLOT_DURATION_MINUTES = 12;

/**
 * OPD sessions. The slot grid is generated from these, and the grid *is* the
 * capacity — there is no separate cap. 180 minutes ÷ 12 = 15 appointments.
 */
export const SESSIONS = {
  MORNING: {
    /** Heading form, e.g. on a button. */
    label: "Morning OPD",
    /** Mid-sentence form. "OPD" is an acronym and must not be lower-cased,
     *  so sentences use this rather than calling .toLowerCase() on the label. */
    sentenceName: "morning session",
    startTime: "10:00",
    endTime: "13:00",
  },
  EVENING: {
    label: "Evening OPD",
    sentenceName: "evening session",
    startTime: "17:00",
    endTime: "20:00",
  },
} as const;

export type SessionName = keyof typeof SESSIONS;

/** Monday–Saturday. Sunday is emergency referrals only, so no bookable slots. */
export const OPD_WEEKDAYS = [1, 2, 3, 4, 5, 6];

export const VISIT_CATEGORIES = [
  "FIRST_VISIT",
  "ROUTINE_FOLLOW_UP",
  "POST_PROCEDURE_REVIEW",
  "EMERGENCY_TRIAGE",
] as const;

export type VisitCategory = (typeof VISIT_CATEGORIES)[number];
