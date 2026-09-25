import { NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/db/connect";
import { releaseExpiredHolds } from "@/lib/slots/claim";

/**
 * Returns lapsed holds to the pool.
 *
 * Without this running on a schedule, an abandoned slot stays unavailable
 * indefinitely — a patient who opens the payment sheet and closes their
 * browser silently removes an appointment from sale for the rest of the day.
 *
 * Protected by a shared secret: an open endpoint that mutates booking state
 * should not be callable by anyone who guesses the URL.
 */
export async function GET(request: Request) {
  const secret = process.env.CRON_SECRET;
  const provided = request.headers.get("authorization")?.replace("Bearer ", "");

  if (!secret || provided !== secret) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  await connectToDatabase();
  const released = await releaseExpiredHolds();

  return NextResponse.json({ ok: true, released });
}
