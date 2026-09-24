import mongoose, { Schema, type InferSchemaType, type Model } from "mongoose";

/**
 * A patient, identified by their mobile number.
 *
 * The phone number is the identity: it is what receives the OTP, what the token
 * SMS is sent to, and what a returning patient logs in with.
 */
const patientSchema = new Schema(
  {
    /** 10-digit Indian mobile, stored without the +91 prefix. */
    phone: { type: String, required: true, unique: true },

    name: { type: String, required: true, trim: true },
    age: { type: Number, min: 0, max: 120 },
    gender: { type: String, enum: ["MALE", "FEMALE", "OTHER"] },

    /** Set once the patient has completed an OTP challenge at least once. */
    phoneVerifiedAt: { type: Date, default: null },
  },
  { timestamps: true },
);

export type Patient = InferSchemaType<typeof patientSchema>;

export const PatientModel: Model<Patient> =
  (mongoose.models.Patient as Model<Patient>) ??
  mongoose.model<Patient>("Patient", patientSchema);
