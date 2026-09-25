import mongoose from "mongoose";
import { BookingModel } from "@/models/booking";
import { PatientModel } from "@/models/patient";
import { PaymentModel } from "@/models/payment";
import { claimSlot, releaseSlot } from "@/lib/slots/claim";
import { CONSULTATION_FEE_PAISE, type SessionName, type VisitCategory } from "@/lib/constants";

export type CreateHoldInput = {
  patientPhone: string;
  patientName: string;
  patientAge?: number;
  patientGender?: "MALE" | "FEMALE" | "OTHER";
  date: string;
  session: SessionName;
  slotTime: string;
  visitCategory: VisitCategory;
};

export type CreateHoldResult =
  | {
      ok: true;
      bookingId: mongoose.Types.ObjectId;
      slotId: mongoose.Types.ObjectId;
      lockExpiresAt: Date;
      amountPaise: number;
    }
  | { ok: false; reason: "SLOT_UNAVAILABLE" | "PHONE_NOT_VERIFIED" };

/**
 * Step 4 of the booking flow: turn a selected slot into a paid-for hold.
 *
 * This is called only after OTP verification (step 2) — see the caller in the
 * booking API route, which checks `patientVerifiedAt` before ever reaching
 * here. Locking a slot for an unverified phone number would let anyone freeze
 * appointments just by tapping through the grid, so verification is a
 * precondition of this function rather than something it checks itself; the
 * caller owns that responsibility and this function trusts it.
 *
 * The slot claim happens FIRST, before the booking document or the Razorpay
 * order exist. If the claim fails, nothing else was created — the patient is
 * simply told the slot is gone and shown alternatives, with no cleanup needed.
 */
export async function createBookingHold(
  input: CreateHoldInput,
): Promise<CreateHoldResult> {
  // A patient can only attend one appointment at a time, so taking a new hold
  // means they have moved on from any previous one. Without this, someone
  // browsing through five slots holds all five for ten minutes each and blocks
  // a third of a session for other patients.
  //
  // Only genuinely abandoned holds are released: anything where money may be
  // moving, or which is already confirmed, is left strictly alone.
  await releaseAbandonedHolds(input.patientPhone);

  const patient = await PatientModel.findOneAndUpdate(
    { phone: input.patientPhone },
    {
      $set: { name: input.patientName, age: input.patientAge, gender: input.patientGender },
      $setOnInsert: { phone: input.patientPhone },
    },
    { upsert: true, returnDocument: "after" },
  );

  // Booking document is created before the slot claim so claimSlot has a
  // bookingId to stamp onto the slot — but it starts in PENDING_PAYMENT with
  // no slot attached, so an unclaimed booking is never mistaken for a real hold.
  const booking = await BookingModel.create({
    patientId: patient._id,
    date: input.date,
    session: input.session,
    visitCategory: input.visitCategory,
    source: "ONLINE",
    status: "PENDING_PAYMENT",
  });

  const claim = await claimSlot(input.date, input.slotTime, booking._id);

  if (!claim.ok) {
    // Roll back the orphaned booking document — nothing else references it yet.
    await BookingModel.deleteOne({ _id: booking._id });
    return { ok: false, reason: "SLOT_UNAVAILABLE" };
  }

  booking.slotId = claim.slotId;
  booking.slotTime = input.slotTime;
  await booking.save();

  return {
    ok: true,
    bookingId: booking._id,
    slotId: claim.slotId,
    lockExpiresAt: claim.lockExpiresAt,
    amountPaise: CONSULTATION_FEE_PAISE,
  };
}

/**
 * Release any unpaid, untouched hold this patient is still sitting on.
 *
 * Deliberately narrow. A booking is only reclaimed when it is PENDING_PAYMENT
 * *and* no payment was ever attempted — a patient whose bank is mid-transaction
 * (PAYMENT_IN_FLIGHT) keeps their slot, and a confirmed booking is never
 * touched, so a family sharing one phone number can still hold two real
 * appointments.
 */
async function releaseAbandonedHolds(phone: string): Promise<void> {
  const patient = await PatientModel.findOne({ phone });
  if (!patient) return;

  const abandoned = await BookingModel.find({
    patientId: patient._id,
    status: "PENDING_PAYMENT",
  });

  for (const booking of abandoned) {
    const payment = await PaymentModel.findOne({ bookingId: booking._id });

    // If a payment id exists, the patient reached the gateway and money may
    // be in flight. Leave it for the webhook and the sweep to resolve.
    if (payment?.razorpayPaymentId) continue;

    if (booking.slotId) await releaseSlot(booking.slotId);
    booking.status = "EXPIRED";
    await booking.save();
  }
}
