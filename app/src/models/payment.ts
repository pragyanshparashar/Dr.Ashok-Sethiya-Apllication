import mongoose, { Schema, type InferSchemaType, type Model } from "mongoose";

/**
 * A payment attempt against a booking.
 *
 * Three independent paths can confirm the same payment — the Razorpay webhook,
 * the status page verifying directly with Razorpay's API, and the background
 * reconciliation sweep. All three write here, so the unique index on
 * `razorpayPaymentId` is what makes them idempotent: whichever arrives first
 * wins, and the others cannot create a duplicate.
 */
const paymentSchema = new Schema(
  {
    bookingId: { type: Schema.Types.ObjectId, ref: "Booking", required: true },

    /**
     * How the money arrived. The admin revenue split (online vs cash desk)
     * is computed from this, so counter payments must be recorded here too.
     */
    method: {
      type: String,
      required: true,
      enum: ["RAZORPAY_ONLINE", "CASH_AT_DESK", "UPI_AT_COUNTER"],
    },

    /** Always in paise. Set server-side from the fee constant, never from the client. */
    amountPaise: { type: Number, required: true },

    status: {
      type: String,
      required: true,
      enum: ["CREATED", "AUTHORIZED", "CAPTURED", "FAILED", "REFUNDED"],
      default: "CREATED",
    },

    razorpayOrderId: { type: String, default: null },
    razorpayPaymentId: { type: String, default: null },
    razorpayRefundId: { type: String, default: null },

    /** Why a refund was issued — e.g. slot lost after a late-arriving payment. */
    refundReason: { type: String, default: null },

    /** Which path confirmed this, for debugging reconciliation gaps. */
    confirmedVia: {
      type: String,
      enum: ["WEBHOOK", "STATUS_PAGE_VERIFY", "RECONCILIATION_SWEEP", "STAFF_DESK"],
      default: null,
    },

    /** Raw gateway payload, kept for dispute resolution and audit. */
    gatewayPayload: { type: Schema.Types.Mixed, default: null },
  },
  { timestamps: true },
);

/**
 * The idempotency guarantee. Whichever of the three confirmation paths arrives
 * first records the payment; the rest collide here and no-op, so a patient can
 * never end up with two bookings from one payment.
 */
paymentSchema.index(
  { razorpayPaymentId: 1 },
  { unique: true, partialFilterExpression: { razorpayPaymentId: { $type: "string" } } },
);

paymentSchema.index({ bookingId: 1 });

/** Serving the daily revenue split and the reconciliation sweep. */
paymentSchema.index({ status: 1, createdAt: -1 });

export type Payment = InferSchemaType<typeof paymentSchema>;

export const PaymentModel: Model<Payment> =
  (mongoose.models.Payment as Model<Payment>) ??
  mongoose.model<Payment>("Payment", paymentSchema);
