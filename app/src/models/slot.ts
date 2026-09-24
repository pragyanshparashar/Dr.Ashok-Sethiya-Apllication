import mongoose, { Schema, type InferSchemaType, type Model } from "mongoose";
import type { SessionName } from "@/lib/constants";

/**
 * A single bookable consultation slot on a single day.
 *
 * This collection is the clinic's capacity. One document exists per slot per
 * working day, and a slot is claimed by atomically flipping its status. Because
 * exactly one document represents a given date+time, two patients cannot both
 * be granted the same slot — whoever loses the race simply gets `null` back,
 * before any money has moved.
 *
 * Slot lifecycle:
 *
 *   AVAILABLE ──claim──▶ HELD ──payment confirmed──▶ BOOKED
 *       ▲                 │                            │
 *       └──lock expired───┘                            │
 *       └────────────────── cancelled ─────────────────┘
 */
const slotSchema = new Schema(
  {
    /** Calendar date in IST, stored as "YYYY-MM-DD" so it can never drift by timezone. */
    date: { type: String, required: true },

    /** "HH:mm" in IST, e.g. "17:30". The slot's start time. */
    time: { type: String, required: true },

    session: {
      type: String,
      required: true,
      enum: ["MORNING", "EVENING"] satisfies SessionName[],
    },

    status: {
      type: String,
      required: true,
      enum: ["AVAILABLE", "HELD", "BOOKED"],
      default: "AVAILABLE",
    },

    /** Set while the slot is HELD. A sweep releases slots whose hold has lapsed. */
    lockExpiresAt: { type: Date, default: null },

    /** The booking currently holding or occupying this slot. */
    bookingId: { type: Schema.Types.ObjectId, ref: "Booking", default: null },
  },
  { timestamps: true },
);

/**
 * The hard guarantee. One document per date+time means the database itself
 * refuses a duplicate slot, so a bug in application code cannot create a second
 * claimable copy of the same appointment time.
 */
slotSchema.index({ date: 1, time: 1 }, { unique: true });

/** Serving the booking screen: "which slots are free on this date?" */
slotSchema.index({ date: 1, session: 1, status: 1 });

/** Serving the expiry sweep: "which holds have lapsed?" */
slotSchema.index({ status: 1, lockExpiresAt: 1 });

export type Slot = InferSchemaType<typeof slotSchema>;

export const SlotModel: Model<Slot> =
  (mongoose.models.Slot as Model<Slot>) ??
  mongoose.model<Slot>("Slot", slotSchema);
