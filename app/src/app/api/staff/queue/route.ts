import { NextResponse } from "next/server";
import { getQueue, getQueueStats } from "@/lib/queue/service";
import type { SessionName } from "@/lib/constants";

/** Polled by the desk every few seconds — this is the live queue. */
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const date = searchParams.get("date");
  const session = searchParams.get("session");

  if (!date?.match(/^\d{4}-\d{2}-\d{2}$/) || (session !== "MORNING" && session !== "EVENING")) {
    return NextResponse.json({ error: "Invalid date or session" }, { status: 400 });
  }

  const [queue, stats] = await Promise.all([
    getQueue(date, session as SessionName),
    getQueueStats(date, session as SessionName),
  ]);

  return NextResponse.json({ queue, stats });
}
