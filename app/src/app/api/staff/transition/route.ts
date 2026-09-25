import { NextResponse } from "next/server";
import { z } from "zod";
import { transitionBooking } from "@/lib/queue/service";

const schema = z.object({
  bookingId: z.string(),
  to: z.enum(["ARRIVED", "IN_CONSULTATION", "COMPLETED", "NO_SHOW", "CANCELLED"]),
});

export async function POST(request: Request) {
  const parsed = schema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }

  const result = await transitionBooking(parsed.data.bookingId, parsed.data.to);
  if (!result.ok) return NextResponse.json({ error: result.reason }, { status: 409 });

  return NextResponse.json({ ok: true });
}
