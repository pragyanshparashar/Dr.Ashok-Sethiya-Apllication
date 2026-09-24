import { NextResponse } from "next/server";
import mongoose from "mongoose";
import { connectToDatabase } from "@/lib/db/connect";
import { verifyWebhookSignature } from "@/lib/payments/verify-signature";
import { confirmBooking } from "@/lib/bookings/confirm";
import { extendHold } from "@/lib/slots/claim";
import { BookingModel } from "@/models/booking";
import { PaymentModel } from "@/models/payment";
import { PatientModel } from "@/models/patient";
import { sendTokenSms } from "@/lib/sms/send";
import { formatSlotWithSession } from "@/lib/time";
import type { SessionName } from "@/lib/constants";

/**
 * Razorpay's webhook — the source of truth for whether money arrived.
 *
 * The browser redirect after checkout travels through the patient's phone, so
 * it is lost whenever they close the tab, lose signal, or never return from
 * their UPI app. This path is server-to-server and Razorpay retries it for
 * hours, which is why the booking is confirmed here rather than on the
 * patient's say-so.
 *
 * Responds 200 quickly even for events we ignore: a non-2xx tells Razorpay to
 * retry, and retrying an event we simply do not care about is pure noise.
 */
export async function POST(request: Request) {
  // The raw body is required — re-serialising parsed JSON would change
  // whitespace and key order, and the signature would no longer match.
  const rawBody = await request.text();
  const signature = request.headers.get("x-razorpay-signature") ?? "";

  if (!verifyWebhookSignature(rawBody, signature)) {
    // Do not say why. A detailed rejection helps someone probing for a forgery.
    return NextResponse.json({ error: "Invalid signature" }, { status: 401 });
  }

  let event: {
    event: string;
    payload?: { payment?: { entity?: { id?: string; order_id?: string; notes?: Record<string, string> } } };
  };

  try {
    event = JSON.parse(rawBody);
  } catch {
    return NextResponse.json({ error: "Malformed payload" }, { status: 400 });
  }

  const payment = event.payload?.payment?.entity;
  if (!payment?.id || !payment.order_id) {
    return NextResponse.json({ ok: true, ignored: "no payment entity" });
  }

  await connectToDatabase();

  const record = await PaymentModel.findOne({ razorpayOrderId: payment.order_id });
  if (!record) {
    // An order we have no record of. Acknowledge so Razorpay stops retrying,
    // but log it — this should not happen and may indicate a lost booking.
    console.error(`Webhook for unknown order ${payment.order_id}`);
    return NextResponse.json({ ok: true, ignored: "unknown order" });
  }

  switch (event.event) {
    case "payment.captured":
      await handleCaptured(record.bookingId, payment.id);
      break;

    case "payment.authorized":
      // Money is moving but not yet settled. Hold the slot open rather than
      // letting it lapse — releasing a slot while a patient's payment is in
      // flight creates exactly the late-arrival problem the hold prevents.
      await handleAuthorized(record.bookingId);
      break;

    case "payment.failed":
      await BookingModel.updateOne(
        { _id: record.bookingId, status: { $in: ["PENDING_PAYMENT", "PAYMENT_IN_FLIGHT"] } },
        { $set: { status: "FAILED" } },
      );
      await PaymentModel.updateOne(
        { _id: record._id },
        { $set: { status: "FAILED", razorpayPaymentId: payment.id } },
      );
      break;
  }

  return NextResponse.json({ ok: true });
}

async function handleAuthorized(bookingId: mongoose.Types.ObjectId): Promise<void> {
  const booking = await BookingModel.findById(bookingId);
  if (!booking?.slotId) return;

  await BookingModel.updateOne(
    { _id: bookingId, status: "PENDING_PAYMENT" },
    { $set: { status: "PAYMENT_IN_FLIGHT" } },
  );
  await extendHold(booking.slotId);
}

async function handleCaptured(
  bookingId: mongoose.Types.ObjectId,
  razorpayPaymentId: string,
): Promise<void> {
  const result = await confirmBooking(bookingId, razorpayPaymentId, "WEBHOOK");

  if (!result.ok) {
    // The slot was lost while this payment was in flight. The patient has paid
    // for an appointment that no longer exists and must be refunded — handled
    // by the reconciliation sweep, which owns the refund decision.
    console.error(`Cannot confirm booking ${bookingId}: ${result.reason}`);
    return;
  }

  // Already confirmed by another path; that path already sent the SMS.
  if (result.alreadyConfirmed) return;

  const booking = await BookingModel.findById(bookingId);
  if (!booking?.slotTime) return;

  const patient = await PatientModel.findById(booking.patientId);
  if (!patient) return;

  await sendTokenSms(
    patient.phone,
    result.tokenNumber,
    formatSlotWithSession(booking.slotTime, booking.session as SessionName),
    booking.date,
  );
}
