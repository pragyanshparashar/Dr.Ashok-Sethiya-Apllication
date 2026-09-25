import { NextResponse } from "next/server";
import mongoose from "mongoose";
import { connectToDatabase } from "@/lib/db/connect";
import { BookingModel } from "@/models/booking";
import { PaymentModel } from "@/models/payment";
import { PatientModel } from "@/models/patient";
import { getRazorpayClient } from "@/lib/payments/razorpay";
import { confirmBooking } from "@/lib/bookings/confirm";
import { SlotModel } from "@/models/slot";
import { releaseExpiredHolds } from "@/lib/slots/claim";

/**
 * What the status page polls.
 *
 * As well as reporting state, this is the SECOND of the three confirmation
 * paths: if the booking is still unconfirmed, it asks Razorpay directly rather
 * than waiting for the webhook. That matters on UPI, where the patient may
 * return to this page at the same moment the webhook is still in flight.
 *
 * confirmBooking is idempotent, so this racing the webhook is harmless — one
 * of them wins and the other finds the work already done.
 */
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  if (!mongoose.Types.ObjectId.isValid(id)) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  await connectToDatabase();

  // Reclaim any hold that has lapsed. Running this here as well as on a
  // schedule means an abandoned slot returns to sale the moment anyone looks,
  // rather than sitting unavailable until the next sweep.
  await releaseExpiredHolds();

  const booking = await BookingModel.findById(id);
  if (!booking) return NextResponse.json({ error: "Not found" }, { status: 404 });

  if (booking.status !== "CONFIRMED" && booking.tokenNumber === null) {
    await tryVerifyWithGateway(booking._id);
    // Re-read: the verification above may have just confirmed it.
    const refreshed = await BookingModel.findById(id);
    if (refreshed) return NextResponse.json(await shape(refreshed));
  }

  return NextResponse.json(await shape(booking));
}

async function tryVerifyWithGateway(bookingId: mongoose.Types.ObjectId): Promise<void> {
  const payment = await PaymentModel.findOne({ bookingId });
  if (!payment?.razorpayOrderId) return;

  try {
    const razorpay = getRazorpayClient();
    const { items } = await razorpay.orders.fetchPayments(payment.razorpayOrderId);

    const captured = items?.find((p) => p.status === "captured");
    if (captured) {
      await confirmBooking(bookingId, captured.id, "STATUS_PAGE_VERIFY");
      return;
    }

    // Money is moving but not settled — typical while a UPI approval is still
    // open in the patient's payment app.
    if (items?.some((p) => p.status === "authorized")) {
      await BookingModel.updateOne(
        { _id: bookingId, status: "PENDING_PAYMENT" },
        { $set: { status: "PAYMENT_IN_FLIGHT" } },
      );
    }
  } catch (error) {
    // A gateway hiccup must not break the page. The webhook and the
    // reconciliation sweep are still covering this booking.
    console.error("Status-page verification failed:", error);
  }
}

async function shape(booking: InstanceType<typeof BookingModel>) {
  const patient = await PatientModel.findById(booking.patientId);
  const payment = await PaymentModel.findOne({ bookingId: booking._id });
  const slot = booking.slotId ? await SlotModel.findById(booking.slotId) : null;

  return {
    status: booking.status,
    tokenNumber: booking.tokenNumber,
    date: booking.date,
    session: booking.session,
    slotTime: booking.slotTime,
    patientName: patient?.name ?? null,
    patientPhone: patient?.phone ?? null,
    amountPaise: payment?.amountPaise ?? null,
    paymentReference: payment?.razorpayPaymentId ?? null,

    /**
     * Whether the patient actually started paying.
     *
     * Without this the page cannot tell "dismissed the payment sheet" from
     * "bank is still processing" — and it was showing the second message for
     * both, telling patients their money was safe when they had never paid.
     */
    paymentAttempted:
      booking.status === "PAYMENT_IN_FLIGHT" || Boolean(payment?.razorpayPaymentId),

    /** Null once the hold has lapsed or been converted. */
    holdExpiresAt:
      slot?.status === "HELD" ? (slot.lockExpiresAt?.toISOString() ?? null) : null,

    orderId: payment?.razorpayOrderId ?? null,
    razorpayKeyId: process.env.RAZORPAY_KEY_ID ?? null,
  };
}
