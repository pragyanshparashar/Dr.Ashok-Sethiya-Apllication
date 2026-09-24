import mongoose, { Schema, type InferSchemaType, type Model } from "mongoose";
import { VISIT_CATEGORIES } from "@/lib/constants";

/**
 * A patient's appointment.
 *
 * Two numbers matter here and they are deliberately separate:
 *
 *   tokenNumber   The patient's identity for the day. Printed on their pass,
 *                 assigned only once payment is confirmed, and NEVER changed or
 *                 renumbered — a cancelled token stays cancelled and leaves a gap.
 *
 *   queuePosition The order the doctor actually works through. Staff reorder this
 *                 freely for emergencies, late arrivals and no-shows. It is a
 *                 float so a patient can be slotted between two others (3.5)
 *                 without renumbering anyone.
 *
 * Conflating the two would mean an emergency patient could only be seen first by
 * taking someone else's token number — which would invalidate a pass a patient
 * is already holding in the waiting room.
 */
const bookingSchema = new Schema(
  {
    patientId: { type: Schema.Types.ObjectId, ref: "Patient", required: true },

    /** The claimed slot. Null only for overflow bookings (see isOverflow). */
    slotId: { type: Schema.Types.ObjectId, ref: "Slot", default: null },

    /** Denormalised from the slot so the queue and token pass read cheaply. */
    date: { type: String, required: true },
    session: { type: String, required: true, enum: ["MORNING", "EVENING"] },
    slotTime: { type: String, default: null },

    status: {
      type: String,
      required: true,
      enum: [
        "PENDING_PAYMENT",   // slot held, awaiting payment
        "PAYMENT_IN_FLIGHT", // money moving at the bank; hold is extended
        "FAILED",            // declined; retry offered while the hold lasts
        "EXPIRED",           // hold lapsed with no payment attempted
        "CONFIRMED",         // paid; token assigned
        "ARRIVED",           // checked in at reception
        "IN_CONSULTATION",
        "COMPLETED",
        "CANCELLED",
        "NO_SHOW",
      ],
      default: "PENDING_PAYMENT",
    },

    /** Assigned at CONFIRMED, never at hold time — an unpaid hold must not burn a number. */
    tokenNumber: { type: Number, default: null },

    /** Float, so staff can insert between positions without renumbering. */
    queuePosition: { type: Number, default: null },

    visitCategory: { type: String, enum: VISIT_CATEGORIES, required: true },

    source: { type: String, enum: ["ONLINE", "WALK_IN"], required: true },

    /**
     * An emergency or staff-override booking that sits outside the slot grid.
     * These have no slotId and queue at the end, so they never collide with the
     * slot collection's uniqueness guarantee.
     */
    isOverflow: { type: Boolean, default: false },

    /** Who overrode capacity, and why. Silent overbooking is not permitted. */
    overrideBy: { type: Schema.Types.ObjectId, ref: "StaffUser", default: null },
    overrideReason: { type: String, default: null },

    createdByStaffId: { type: Schema.Types.ObjectId, ref: "StaffUser", default: null },
  },
  { timestamps: true },
);

/** Token numbers are unique within a session on a given day. */
bookingSchema.index(
  { date: 1, session: 1, tokenNumber: 1 },
  { unique: true, partialFilterExpression: { tokenNumber: { $type: "number" } } },
);

/** Serving the live queue screen. */
bookingSchema.index({ date: 1, session: 1, queuePosition: 1 });

/** Serving a patient's "Token & Visits" history. */
bookingSchema.index({ patientId: 1, createdAt: -1 });

export type Booking = InferSchemaType<typeof bookingSchema>;

export const BookingModel: Model<Booking> =
  (mongoose.models.Booking as Model<Booking>) ??
  mongoose.model<Booking>("Booking", bookingSchema);
