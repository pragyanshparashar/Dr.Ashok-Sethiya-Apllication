import { SlotModel } from "@/models/slot";
import { SLOT_LOCK_MINUTES } from "@/lib/constants";
import type mongoose from "mongoose";

export type ClaimResult =
  | { ok: true; slotId: mongoose.Types.ObjectId; lockExpiresAt: Date }
  | { ok: false; reason: "SLOT_UNAVAILABLE" };

/**
 * Claim a slot for a patient who is about to pay.
 *
 * This is the single point where a slot stops being available to everyone else,
 * and it is deliberately one database operation. `findOneAndUpdate` matches and
 * updates atomically, so if two patients tap "Proceed to Pay" in the same
 * millisecond, exactly one document transitions AVAILABLE → HELD and the other
 * request matches nothing and gets `null` back.
 *
 * Crucially this runs BEFORE the Razorpay screen opens. The loser is told the
 * slot has gone while they still have alternatives to pick from — rather than
 * after they have paid, which would mean issuing a refund.
 *
 * The hold is temporary: `lockExpiresAt` lets a sweep return abandoned slots to
 * the pool, so a patient who wanders off mid-payment does not sterilise the
 * clinic's schedule.
 */
export async function claimSlot(
  date: string,
  time: string,
  bookingId: mongoose.Types.ObjectId,
): Promise<ClaimResult> {
  const lockExpiresAt = new Date(Date.now() + SLOT_LOCK_MINUTES * 60_000);

  const claimed = await SlotModel.findOneAndUpdate(
    { date, time, status: "AVAILABLE" },
    { $set: { status: "HELD", lockExpiresAt, bookingId } },
    { returnDocument: "after" },
  );

  if (!claimed) return { ok: false, reason: "SLOT_UNAVAILABLE" };

  return { ok: true, slotId: claimed._id, lockExpiresAt };
}

/**
 * Extend a hold because the patient's payment is genuinely moving at their bank.
 *
 * Bank OTP and 3-D Secure regularly take longer than the initial hold. Releasing
 * a slot while money is actively travelling toward the clinic would manufacture
 * the exact problem the hold exists to prevent: a patient pays, and by the time
 * it lands there is nothing left to give them.
 */
export async function extendHold(slotId: mongoose.Types.ObjectId): Promise<void> {
  await SlotModel.updateOne(
    { _id: slotId, status: "HELD" },
    { $set: { lockExpiresAt: new Date(Date.now() + SLOT_LOCK_MINUTES * 60_000) } },
  );
}

/** Payment confirmed — the hold becomes a booking and the slot is spent. */
export async function markSlotBooked(slotId: mongoose.Types.ObjectId): Promise<void> {
  await SlotModel.updateOne(
    { _id: slotId },
    { $set: { status: "BOOKED", lockExpiresAt: null } },
  );
}

/** Return a slot to the pool — hold abandoned, payment failed, or booking cancelled. */
export async function releaseSlot(slotId: mongoose.Types.ObjectId): Promise<void> {
  await SlotModel.updateOne(
    { _id: slotId },
    { $set: { status: "AVAILABLE", lockExpiresAt: null, bookingId: null } },
  );
}

/**
 * Release every hold that has lapsed without a payment attempt.
 *
 * Run on a schedule. Slots whose booking reached PAYMENT_IN_FLIGHT are excluded
 * by `extendHold` pushing their expiry forward, so only genuinely abandoned
 * holds are reclaimed here.
 */
export async function releaseExpiredHolds(): Promise<number> {
  const result = await SlotModel.updateMany(
    { status: "HELD", lockExpiresAt: { $lt: new Date() } },
    { $set: { status: "AVAILABLE", lockExpiresAt: null, bookingId: null } },
  );
  return result.modifiedCount;
}
