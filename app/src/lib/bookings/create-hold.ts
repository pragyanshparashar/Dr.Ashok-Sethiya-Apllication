import mongoose from "mongoose";
import { BookingModel } from "@/models/booking";
import { PatientModel } from "@/models/patient";
import { claimSlot } from "@/lib/slots/claim";
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
