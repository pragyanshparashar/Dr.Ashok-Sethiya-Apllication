import mongoose from "mongoose";
import { getRazorpayClient } from "./razorpay";
import { PaymentModel } from "@/models/payment";
import { CONSULTATION_FEE_PAISE } from "@/lib/constants";

/**
 * Create a Razorpay order for a held booking.
 *
 * The amount is always CONSULTATION_FEE_PAISE from our own constants — never a
 * number supplied by the client. If the browser could dictate the amount, a
 * modified request could book a ₹500 consultation for ₹1.
 */
export async function createPaymentOrder(bookingId: mongoose.Types.ObjectId) {
  const razorpay = getRazorpayClient();

  const order = await razorpay.orders.create({
    amount: CONSULTATION_FEE_PAISE,
    currency: "INR",
    receipt: bookingId.toString(),
    notes: { bookingId: bookingId.toString() },
  });

  const payment = await PaymentModel.create({
    bookingId,
    method: "RAZORPAY_ONLINE",
    amountPaise: CONSULTATION_FEE_PAISE,
    status: "CREATED",
    razorpayOrderId: order.id,
  });

  return { orderId: order.id, paymentId: payment._id };
}
