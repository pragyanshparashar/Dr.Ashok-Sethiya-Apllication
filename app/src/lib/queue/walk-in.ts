import { connectToDatabase } from "@/lib/db/connect";
import { BookingModel } from "@/models/booking";
import { PatientModel } from "@/models/patient";
import { PaymentModel } from "@/models/payment";
import { SlotModel } from "@/models/slot";
import { claimSlot, markSlotBooked } from "@/lib/slots/claim";
import { CONSULTATION_FEE_PAISE, type SessionName, type VisitCategory } from "@/lib/constants";

export type WalkInInput = {
  name: string;
  phone: string;
  age?: number;
  gender?: "MALE" | "FEMALE" | "OTHER";
  visitCategory: VisitCategory;
  paymentMethod: "CASH_AT_DESK" | "UPI_AT_COUNTER";
  date: string;
  session: SessionName;
  /** Set only when the session is full and staff choose to squeeze someone in. */
  override?: { reason: string; staffId?: string };
};

export type WalkInResult =
  | { ok: true; tokenNumber: number; slotTime: string | null; isOverflow: boolean }
  | { ok: false; reason: "SESSION_FULL"; availableSlots: number };

/**
 * Register a patient at the desk and put them in the queue.
 *
 * This goes through the SAME atomic claim as online booking. If the desk wrote
 * bookings directly, the locking on the patient-facing side would be pointless:
 * staff could quietly fill a session past capacity through a second door with
 * no lock on it, and the doctor would discover it by running two hours late.
 *
 * Payment is recorded as already collected, because the patient is standing
 * there handing over cash or scanning a counter QR.
 */
export async function registerWalkIn(input: WalkInInput): Promise<WalkInResult> {
  await connectToDatabase();

  const freeSlot = await SlotModel.findOne({
    date: input.date,
    session: input.session,
    status: "AVAILABLE",
  }).sort({ time: 1 });

  // No slot free and no deliberate override: refuse, and say how full it is.
  // Silent overbooking is the thing we are preventing; overbooking on purpose,
  // with a name against it, is a legitimate clinical decision.
  if (!freeSlot && !input.override) {
    return { ok: false, reason: "SESSION_FULL", availableSlots: 0 };
  }

  const patient = await PatientModel.findOneAndUpdate(
    { phone: input.phone },
    {
      $set: { name: input.name, age: input.age, gender: input.gender },
      $setOnInsert: { phone: input.phone },
    },
    { upsert: true, returnDocument: "after" },
  );

  const tokenNumber = await nextTokenNumber(input.date, input.session);

  const booking = await BookingModel.create({
    patientId: patient._id,
    date: input.date,
    session: input.session,
    visitCategory: input.visitCategory,
    source: "WALK_IN",
    status: "ARRIVED", // they are physically here
    tokenNumber,
    // Placed at the end of the queue. Staff can drag them earlier if the
    // clinical picture demands it.
    queuePosition: tokenNumber,
    isOverflow: !freeSlot,
    overrideReason: input.override?.reason ?? null,
  });

  let slotTime: string | null = null;

  if (freeSlot) {
    const claim = await claimSlot(input.date, freeSlot.time, booking._id);
    if (claim.ok) {
      await markSlotBooked(claim.slotId);
      booking.slotId = claim.slotId;
      booking.slotTime = freeSlot.time;
      slotTime = freeSlot.time;
      await booking.save();
    }
    // If the claim lost a race to an online patient, the walk-in simply
    // becomes an overflow booking — they are standing at the desk and cannot
    // be turned away for a millisecond of bad luck.
    else {
      booking.isOverflow = true;
      await booking.save();
    }
  }

  await PaymentModel.create({
    bookingId: booking._id,
    method: input.paymentMethod,
    amountPaise: CONSULTATION_FEE_PAISE,
    status: "CAPTURED",
    confirmedVia: "STAFF_DESK",
  });

  return { ok: true, tokenNumber, slotTime, isOverflow: booking.isOverflow ?? false };
}

/**
 * Next token for the session.
 *
 * Highest + 1, never a count: cancelled tokens keep their numbers forever and
 * leave permanent gaps, so counting would reissue a number a patient in the
 * waiting room is still holding.
 */
async function nextTokenNumber(date: string, session: SessionName): Promise<number> {
  const highest = await BookingModel.findOne(
    { date, session, tokenNumber: { $ne: null } },
    { tokenNumber: 1 },
  ).sort({ tokenNumber: -1 });

  return (highest?.tokenNumber ?? 0) + 1;
}
