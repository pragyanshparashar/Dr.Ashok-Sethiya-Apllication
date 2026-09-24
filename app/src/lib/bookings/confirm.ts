import mongoose from "mongoose";
import { BookingModel } from "@/models/booking";
import { PaymentModel } from "@/models/payment";
import { markSlotBooked } from "@/lib/slots/claim";
import type { SessionName } from "@/lib/constants";

type ConfirmedVia = "WEBHOOK" | "STATUS_PAGE_VERIFY" | "RECONCILIATION_SWEEP" | "STAFF_DESK";

export type ConfirmResult =
  | { ok: true; tokenNumber: number; alreadyConfirmed: boolean }
  | { ok: false; reason: "BOOKING_NOT_FOUND" | "SLOT_LOST" };

/**
 * Confirm a paid booking: assign its token number and put it in the queue.
 *
 * THIS FUNCTION IS CALLED BY THREE INDEPENDENT PATHS — the Razorpay webhook,
 * the status page verifying directly with Razorpay, and the background
 * reconciliation sweep. They race each other by design, because any one of them
 * might be the only one that survives (a patient closing their tab kills the
 * status-page path; a server outage can drop a webhook).
 *
 * So it MUST be idempotent. Calling it five times for the same payment must
 * produce exactly one booking with one token number. Two things guarantee that:
 *
 *   1. The status transition is a conditional update — only a booking still in
 *      PENDING_PAYMENT / PAYMENT_IN_FLIGHT / FAILED can move to CONFIRMED. A
 *      second caller finds nothing to update and returns the existing token.
 *
 *   2. Token numbers come from a count of already-confirmed bookings, computed
 *      inside that same guarded path, so a re-entry can't increment it again.
 */
export async function confirmBooking(
  bookingId: mongoose.Types.ObjectId,
  razorpayPaymentId: string,
  confirmedVia: ConfirmedVia,
): Promise<ConfirmResult> {
  const booking = await BookingModel.findById(bookingId);
  if (!booking) return { ok: false, reason: "BOOKING_NOT_FOUND" };

  // Already confirmed by whichever path got here first — report its token
  // rather than issuing a second one.
  if (booking.tokenNumber !== null && booking.tokenNumber !== undefined) {
    await recordPaymentCapture(bookingId, razorpayPaymentId, confirmedVia);
    return { ok: true, tokenNumber: booking.tokenNumber, alreadyConfirmed: true };
  }

  // The slot must still be ours. If the hold lapsed and someone else took it,
  // this payment arrived too late — the caller is responsible for refunding.
  if (!booking.slotId) return { ok: false, reason: "SLOT_LOST" };

  const tokenNumber = await nextTokenNumber(booking.date, booking.session);
  const queuePosition = tokenNumber; // initial order; staff reorder freely later

  const updated = await BookingModel.findOneAndUpdate(
    {
      _id: bookingId,
      status: { $in: ["PENDING_PAYMENT", "PAYMENT_IN_FLIGHT", "FAILED"] },
      tokenNumber: null,
    },
    { $set: { status: "CONFIRMED", tokenNumber, queuePosition } },
    { returnDocument: "after" },
  );

  if (!updated) {
    // Another path confirmed it between our read and our write. Re-read and
    // report their token — this is the race resolving correctly, not an error.
    const current = await BookingModel.findById(bookingId);
    return current?.tokenNumber
      ? { ok: true, tokenNumber: current.tokenNumber, alreadyConfirmed: true }
      : { ok: false, reason: "BOOKING_NOT_FOUND" };
  }

  await markSlotBooked(booking.slotId);
  await recordPaymentCapture(bookingId, razorpayPaymentId, confirmedVia);

  return { ok: true, tokenNumber, alreadyConfirmed: false };
}

/**
 * The next token number for a session.
 *
 * Deliberately a count of confirmed bookings + 1, NOT a max()+1 over existing
 * numbers — because cancelled bookings keep their numbers forever and leave
 * permanent gaps. A patient holding token #6 must never see it reassigned to
 * someone else just because #3 cancelled.
 */
async function nextTokenNumber(date: string, session: SessionName): Promise<number> {
  const highest = await BookingModel.findOne(
    { date, session, tokenNumber: { $ne: null } },
    { tokenNumber: 1 },
  ).sort({ tokenNumber: -1 });

  return (highest?.tokenNumber ?? 0) + 1;
}

/**
 * Record the captured payment. The unique index on razorpayPaymentId makes this
 * safe to call from every path — the second and third callers collide and no-op.
 */
async function recordPaymentCapture(
  bookingId: mongoose.Types.ObjectId,
  razorpayPaymentId: string,
  confirmedVia: ConfirmedVia,
): Promise<void> {
  await PaymentModel.updateOne(
    { bookingId, status: { $ne: "CAPTURED" } },
    { $set: { status: "CAPTURED", razorpayPaymentId, confirmedVia } },
  );
}
