import { NextResponse } from "next/server";
import { z } from "zod";
import { requestOtp } from "@/lib/otp/service";

const schema = z.object({
  phone: z.string().regex(/^[6-9]\d{9}$/, "Enter a valid 10-digit mobile number"),
});

export async function POST(request: Request) {
  const parsed = schema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Invalid request" },
      { status: 400 },
    );
  }

  const result = await requestOtp(parsed.data.phone);

  if (!result.ok) {
    if (result.reason === "COOLDOWN") {
      return NextResponse.json(
        {
          error: `Please wait ${result.retryAfterSeconds} seconds before requesting another code.`,
          retryAfterSeconds: result.retryAfterSeconds,
        },
        { status: 429 },
      );
    }
    return NextResponse.json(
      { error: "Enter a valid 10-digit mobile number" },
      { status: 400 },
    );
  }

  return NextResponse.json({ ok: true, expiresAt: result.expiresAt });
}
