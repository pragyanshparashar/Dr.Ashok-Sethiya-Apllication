import { NextResponse } from "next/server";
import { z } from "zod";
import { verifyOtp } from "@/lib/otp/service";

const schema = z.object({
  phone: z.string().regex(/^[6-9]\d{9}$/),
  code: z.string().regex(/^\d{6}$/),
});

/** Wording the patient sees. Deliberately plain — no jargon, no blame. */
const MESSAGES: Record<string, string> = {
  NO_CODE: "No code was requested for this number. Please request one.",
  EXPIRED: "That code has expired. Please request a new one.",
  TOO_MANY_ATTEMPTS: "Too many incorrect attempts. Please request a new code.",
  WRONG_CODE: "That code is not correct.",
};

export async function POST(request: Request) {
  const parsed = schema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: "Enter the 6-digit code" }, { status: 400 });
  }

  const result = await verifyOtp(parsed.data.phone, parsed.data.code);

  if (!result.ok) {
    const message = MESSAGES[result.reason] ?? "Verification failed.";
    const withAttempts =
      result.attemptsLeft !== undefined && result.attemptsLeft > 0
        ? `${message} ${result.attemptsLeft} attempt${result.attemptsLeft === 1 ? "" : "s"} remaining.`
        : message;

    return NextResponse.json({ error: withAttempts }, { status: 400 });
  }

  return NextResponse.json({ ok: true });
}
