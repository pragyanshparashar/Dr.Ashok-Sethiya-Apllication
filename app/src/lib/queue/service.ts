import mongoose from "mongoose";
import { connectToDatabase } from "@/lib/db/connect";
import { BookingModel } from "@/models/booking";
import { PatientModel } from "@/models/patient";
import { PaymentModel } from "@/models/payment";
import type { SessionName } from "@/lib/constants";

export type QueueEntry = {
  bookingId: string;
  tokenNumber: number | null;
  queuePosition: number | null;
  slotTime: string | null;
  patientName: string;
  patientPhone: string;
  patientAge: number | null;
  patientGender: string | null;
  visitCategory: string;
  status: string;
  source: string;
  isOverflow: boolean;
  paymentMethod: string | null;
  paymentStatus: string | null;
  amountPaise: number | null;
};

/**
 * Everyone the clinic expects today, in the order they will actually be seen.
 *
 * Ordered by queuePosition rather than tokenNumber. Those are deliberately
 * different: a walk-in physically present at 6pm holds a high token but should
 * be seen before a 7:30pm booking who has not arrived, and an emergency is
 * seen first regardless of number. Sorting by token would make both impossible
 * without renumbering patients who are already holding a printed pass.
 */
export async function getQueue(date: string, session: SessionName): Promise<QueueEntry[]> {
  await connectToDatabase();

  const bookings = await BookingModel.find({
    date,
    session,
    // Holds that were never paid for are not patients — they are abandoned
    // shopping carts, and showing them would make the queue meaningless.
    status: { $nin: ["PENDING_PAYMENT", "EXPIRED", "FAILED"] },
  }).sort({ queuePosition: 1, tokenNumber: 1 });

  const patientIds = bookings.map((b) => b.patientId);
  const bookingIds = bookings.map((b) => b._id);

  const [patients, payments] = await Promise.all([
    PatientModel.find({ _id: { $in: patientIds } }),
    PaymentModel.find({ bookingId: { $in: bookingIds } }),
  ]);

  const patientById = new Map(patients.map((p) => [p._id.toString(), p]));
  const paymentByBooking = new Map(payments.map((p) => [p.bookingId.toString(), p]));

  return bookings.map((booking) => {
    const patient = patientById.get(booking.patientId.toString());
    const payment = paymentByBooking.get(booking._id.toString());

    return {
      bookingId: booking._id.toString(),
      tokenNumber: booking.tokenNumber ?? null,
      queuePosition: booking.queuePosition ?? null,
      slotTime: booking.slotTime ?? null,
      patientName: patient?.name ?? "Unknown",
      patientPhone: patient?.phone ?? "",
      patientAge: patient?.age ?? null,
      patientGender: patient?.gender ?? null,
      visitCategory: booking.visitCategory,
      status: booking.status,
      source: booking.source,
      isOverflow: booking.isOverflow ?? false,
      paymentMethod: payment?.method ?? null,
      paymentStatus: payment?.status ?? null,
      amountPaise: payment?.amountPaise ?? null,
    };
  });
}

export type QueueStats = {
  total: number;
  arrived: number;
  completed: number;
  waiting: number;
  revenuePaise: { online: number; cash: number };
  unpaidCount: number;
};

/**
 * The figures on the desk's stat cards, computed live rather than stored.
 *
 * Storing running totals would drift the moment anything is cancelled,
 * refunded or marked a no-show, and a clinic reconciling cash at the end of
 * the day needs these to be exactly right.
 */
export async function getQueueStats(date: string, session: SessionName): Promise<QueueStats> {
  const queue = await getQueue(date, session);

  const revenuePaise = { online: 0, cash: 0 };
  let unpaidCount = 0;

  for (const entry of queue) {
    if (entry.paymentStatus === "CAPTURED" && entry.amountPaise) {
      if (entry.paymentMethod === "RAZORPAY_ONLINE") revenuePaise.online += entry.amountPaise;
      else revenuePaise.cash += entry.amountPaise;
    } else if (entry.status !== "CANCELLED") {
      unpaidCount += 1;
    }
  }

  return {
    total: queue.length,
    arrived: queue.filter((e) => ["ARRIVED", "IN_CONSULTATION"].includes(e.status)).length,
    completed: queue.filter((e) => e.status === "COMPLETED").length,
    waiting: queue.filter((e) => e.status === "ARRIVED").length,
    revenuePaise,
    unpaidCount,
  };
}

/**
 * Move a patient through the visit.
 *
 * Transitions are guarded rather than blind writes: reception clicking "Call
 * in" twice, or two staff acting at once, must not push someone backwards or
 * mark a completed visit as waiting again.
 */
const ALLOWED_TRANSITIONS: Record<string, string[]> = {
  CONFIRMED: ["ARRIVED", "CANCELLED", "NO_SHOW"],
  ARRIVED: ["IN_CONSULTATION", "NO_SHOW", "CANCELLED"],
  IN_CONSULTATION: ["COMPLETED", "ARRIVED"],
  COMPLETED: [],
  NO_SHOW: ["ARRIVED"],
  CANCELLED: [],
};

export async function transitionBooking(
  bookingId: string,
  to: string,
): Promise<{ ok: true } | { ok: false; reason: string }> {
  if (!mongoose.Types.ObjectId.isValid(bookingId)) {
    return { ok: false, reason: "Unknown booking" };
  }

  await connectToDatabase();
  const booking = await BookingModel.findById(bookingId);
  if (!booking) return { ok: false, reason: "Unknown booking" };

  const allowed = ALLOWED_TRANSITIONS[booking.status] ?? [];
  if (!allowed.includes(to)) {
    return { ok: false, reason: `Cannot go from ${booking.status} to ${to}` };
  }

  // Only one patient can be in the room. Send whoever is currently in
  // consultation back to waiting rather than silently having two.
  if (to === "IN_CONSULTATION") {
    await BookingModel.updateMany(
      { date: booking.date, session: booking.session, status: "IN_CONSULTATION" },
      { $set: { status: "ARRIVED" } },
    );
  }

  booking.status = to as typeof booking.status;
  await booking.save();
  return { ok: true };
}

/**
 * Reorder the queue by dropping a patient between two others.
 *
 * queuePosition is a float precisely so this needs no renumbering: placing
 * someone between positions 3 and 4 gives them 3.5, and every other patient's
 * token and position are untouched.
 */
export async function moveToPosition(
  bookingId: string,
  afterBookingId: string | null,
): Promise<{ ok: boolean }> {
  await connectToDatabase();
  const booking = await BookingModel.findById(bookingId);
  if (!booking) return { ok: false };

  const queue = await BookingModel.find({
    date: booking.date,
    session: booking.session,
    status: { $nin: ["PENDING_PAYMENT", "EXPIRED", "FAILED", "COMPLETED", "CANCELLED"] },
  }).sort({ queuePosition: 1 });

  const others = queue.filter((b) => b._id.toString() !== bookingId);
  const index = afterBookingId
    ? others.findIndex((b) => b._id.toString() === afterBookingId)
    : -1;

  const before = index >= 0 ? (others[index]?.queuePosition ?? 0) : 0;
  const after = others[index + 1]?.queuePosition ?? before + 2;

  booking.queuePosition = (before + after) / 2;
  await booking.save();
  return { ok: true };
}
