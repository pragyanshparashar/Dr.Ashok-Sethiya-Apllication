import mongoose, { Schema, type InferSchemaType, type Model } from "mongoose";

/**
 * A one-time passcode challenge against a phone number.
 *
 * The code itself is never stored — only a hash. An OTP is a credential, and a
 * leaked database dump should not hand an attacker a list of live codes.
 *
 * Verification must happen BEFORE a slot is held. A hold removes an
 * appointment from everyone else's view for ten minutes, so handing one out to
 * an unverified number would let anyone freeze the clinic's schedule by tapping
 * through the grid.
 */
const otpSchema = new Schema(
  {
    /** 10-digit Indian mobile, no +91 prefix. */
    phone: { type: String, required: true },

    /** SHA-256 of the code. Never the code itself. */
    codeHash: { type: String, required: true },

    expiresAt: { type: Date, required: true },

    /** Wrong guesses so far. Caps brute-force attempts against a 6-digit code. */
    attempts: { type: Number, default: 0 },

    verifiedAt: { type: Date, default: null },
  },
  { timestamps: true },
);

/** Look up the newest challenge for a number. */
otpSchema.index({ phone: 1, createdAt: -1 });

/**
 * Mongo removes these automatically once expired. Spent codes have no value
 * and keeping a growing table of phone numbers we no longer need would be
 * needless exposure.
 */
otpSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

export type Otp = InferSchemaType<typeof otpSchema>;

export const OtpModel: Model<Otp> =
  (mongoose.models.Otp as Model<Otp>) ?? mongoose.model<Otp>("Otp", otpSchema);
