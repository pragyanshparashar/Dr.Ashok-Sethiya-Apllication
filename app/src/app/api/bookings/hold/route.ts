import { NextResponse } from "next/server";
import { z } from "zod";
import { connectToDatabase } from "@/lib/db/connect";
import { hasRecentVerification } from "@/lib/otp/service";
import { createBookingHold } from "@/lib/bookings/create-hold";
import { createPaymentOrder } from "@/lib/payments/create-order";
import { releaseSlot } from "@/lib/slots/claim";
import { BookingModel } from "@/models/booking";
import { VISIT_CATEGORIES } from "@/lib/constants";

const schema = z.object({
  phone: z.string().regex(/^[6-9]\d{9}$/),
  name: z.string().trim().min(2).max(100),
  age: z.number().int().min(0).max(120).optional(),
  gender: z.enum(["MALE", "FEMALE", "OTHER"]).optional(),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  session: z.enum(["MORNING", "EVENING"]),
  slotTime: z.string().regex(/^\d{2}:\d{2}$/),
  visitCategory: z.enum(VISIT_CATEGORIES),
});

/**
 * Hold a slot and open a payment order for it.
 *
 * Order of operations matters and is deliberate:
 *
 *   1. Verify the phone was OTP-checked recently. Slot holds are scarce and
 *      must not be handed to unverified numbers.
 *   2. Claim the slot atomically. This happens BEFORE any Razorpay order
 *      exists, so a patient who loses the race is told immediately — while
 *      they still have alternatives — rather than after paying.
 *   3. Only then create the payment order.
 *
 * Note that the amount is never read from the request body. It comes from the
 * server's own constant, so a modified request cannot book a ₹500 consultation
 * for ₹1.
 */
export async function POST(request: Request) {
  const parsed = schema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Invalid booking request" },
      { status: 400 },
    );
  }

  const input = parsed.data;
  await connectToDatabase();

  if (!(await hasRecentVerification(input.phone))) {
    return NextResponse.json(
      { error: "Please verify your mobile number before booking.", code: "PHONE_NOT_VERIFIED" },
      { status: 403 },
    );
  }

  const hold = await createBookingHold({
    patientPhone: input.phone,
    patientName: input.name,
    patientAge: input.age,
    patientGender: input.gender,
    date: input.date,
    session: input.session,
    slotTime: input.slotTime,
    visitCategory: input.visitCategory,
  });

  if (!hold.ok) {
    return NextResponse.json(
      {
        error: "That time was just taken. Please choose another.",
        code: "SLOT_UNAVAILABLE",
      },
      { status: 409 },
    );
  }

  try {
    const order = await createPaymentOrder(hold.bookingId);
    return NextResponse.json({
      ok: true,
      bookingId: hold.bookingId.toString(),
      orderId: order.orderId,
      amountPaise: hold.amountPaise,
      lockExpiresAt: hold.lockExpiresAt,
      razorpayKeyId: process.env.RAZORPAY_KEY_ID,
    });
  } catch (error) {
    // No payment order exists, so this hold can never convert — the patient has
    // no way to pay for it. Releasing immediately rather than leaving the sweep
    // to reclaim it in ten minutes means the slot goes straight back on sale
    // and the patient can retry at once instead of finding it mysteriously gone.
    console.error("Failed to create Razorpay order:", error);
    await releaseSlot(hold.slotId);
    await BookingModel.deleteOne({ _id: hold.bookingId });

    return NextResponse.json(
      {
        error: "Could not reach the payment gateway. Please try again.",
        code: "GATEWAY_UNAVAILABLE",
      },
      { status: 502 },
    );
  }
}
