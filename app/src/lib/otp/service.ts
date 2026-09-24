import { createHash, randomInt, timingSafeEqual } from "node:crypto";
import { connectToDatabase } from "@/lib/db/connect";
import { OtpModel } from "@/models/otp";
import { PatientModel } from "@/models/patient";
import { sendOtpSms } from "@/lib/sms/send";

/** Long enough to receive and type unhurried; short enough that a stolen code is stale. */
const OTP_TTL_MINUTES = 10;

/** A 6-digit code has a million possibilities; five guesses keeps brute force hopeless. */
const MAX_ATTEMPTS = 5;

/** Stops one number being used to bombard another person with texts. */
const RESEND_COOLDOWN_SECONDS = 60;

const hash = (code: string) => createHash("sha256").update(code).digest("hex");

export type RequestOtpResult =
  | { ok: true; expiresAt: Date }
  | { ok: false; reason: "COOLDOWN"; retryAfterSeconds: number }
  | { ok: false; reason: "INVALID_PHONE" };

/**
 * Issue a code to a phone number.
 *
 * `randomInt` is used rather than `Math.random`, which is predictable and
 * wholly unsuitable for anything acting as a credential.
 */
export async function requestOtp(phone: string): Promise<RequestOtpResult> {
  await connectToDatabase();

  if (!/^[6-9]\d{9}$/.test(phone)) {
    return { ok: false, reason: "INVALID_PHONE" };
  }

  const recent = await OtpModel.findOne({ phone }).sort({ createdAt: -1 });
  if (recent) {
    const elapsed = (Date.now() - recent.createdAt.getTime()) / 1000;
    if (elapsed < RESEND_COOLDOWN_SECONDS) {
      return {
        ok: false,
        reason: "COOLDOWN",
        retryAfterSeconds: Math.ceil(RESEND_COOLDOWN_SECONDS - elapsed),
      };
    }
  }

  const code = String(randomInt(100_000, 1_000_000));
  const expiresAt = new Date(Date.now() + OTP_TTL_MINUTES * 60_000);

  await OtpModel.create({ phone, codeHash: hash(code), expiresAt });
  await sendOtpSms(phone, code, OTP_TTL_MINUTES);

  return { ok: true, expiresAt };
}

export type VerifyOtpResult =
  | { ok: true }
  | { ok: false; reason: "NO_CODE" | "EXPIRED" | "TOO_MANY_ATTEMPTS" | "WRONG_CODE"; attemptsLeft?: number };

/**
 * Check a code and, on success, mark the phone number verified.
 *
 * Comparison is constant-time. A plain `===` on a hash leaks information
 * through how long it takes to fail, which is enough to attack given patience.
 */
export async function verifyOtp(phone: string, code: string): Promise<VerifyOtpResult> {
  await connectToDatabase();

  const challenge = await OtpModel.findOne({ phone, verifiedAt: null }).sort({ createdAt: -1 });
  if (!challenge) return { ok: false, reason: "NO_CODE" };
  if (challenge.expiresAt.getTime() < Date.now()) return { ok: false, reason: "EXPIRED" };
  if (challenge.attempts >= MAX_ATTEMPTS) return { ok: false, reason: "TOO_MANY_ATTEMPTS" };

  const supplied = Buffer.from(hash(code));
  const expected = Buffer.from(challenge.codeHash);
  const matches = supplied.length === expected.length && timingSafeEqual(supplied, expected);

  if (!matches) {
    challenge.attempts += 1;
    await challenge.save();
    return {
      ok: false,
      reason: "WRONG_CODE",
      attemptsLeft: Math.max(0, MAX_ATTEMPTS - challenge.attempts),
    };
  }

  challenge.verifiedAt = new Date();
  await challenge.save();

  await PatientModel.updateOne(
    { phone },
    { $set: { phoneVerifiedAt: new Date() }, $setOnInsert: { phone } },
    { upsert: true },
  );

  return { ok: true };
}

/**
 * Has this number completed a challenge recently enough to take a slot hold?
 *
 * Deliberately short. Verification proves someone held that handset a moment
 * ago; it is not a lasting session, and a slot hold is too valuable to grant
 * on a stale proof.
 */
export async function hasRecentVerification(phone: string, withinMinutes = 15): Promise<boolean> {
  await connectToDatabase();
  const cutoff = new Date(Date.now() - withinMinutes * 60_000);
  const verified = await OtpModel.findOne({ phone, verifiedAt: { $gte: cutoff } });
  return verified !== null;
}
