import { NextResponse } from "next/server";
import { z } from "zod";
import { registerWalkIn } from "@/lib/queue/walk-in";
import { VISIT_CATEGORIES } from "@/lib/constants";

const schema = z.object({
  name: z.string().trim().min(2).max(100),
  phone: z.string().regex(/^[6-9]\d{9}$/),
  age: z.number().int().min(0).max(120).optional(),
  gender: z.enum(["MALE", "FEMALE", "OTHER"]).optional(),
  visitCategory: z.enum(VISIT_CATEGORIES),
  paymentMethod: z.enum(["CASH_AT_DESK", "UPI_AT_COUNTER"]),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  session: z.enum(["MORNING", "EVENING"]),
  overrideReason: z.string().trim().min(3).max(200).optional(),
});

export async function POST(request: Request) {
  const parsed = schema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Invalid request" },
      { status: 400 },
    );
  }

  const { overrideReason, ...input } = parsed.data;

  const result = await registerWalkIn({
    ...input,
    override: overrideReason ? { reason: overrideReason } : undefined,
  });

  if (!result.ok) {
    return NextResponse.json(
      {
        error:
          "This session is full. To add anyway, give a reason — it will be recorded against the booking.",
        code: "SESSION_FULL",
      },
      { status: 409 },
    );
  }

  return NextResponse.json({
    ok: true,
    tokenNumber: result.tokenNumber,
    slotTime: result.slotTime,
    isOverflow: result.isOverflow,
  });
}
