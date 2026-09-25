import Link from "next/link";
import { notFound } from "next/navigation";
import { SiteHeader } from "@/components/layout/site-header";
import { BookingForm } from "@/components/booking/booking-form";
import { Card } from "@/components/ui/card";
import { connectToDatabase } from "@/lib/db/connect";
import { SlotModel } from "@/models/slot";
import { CONSULTATION_FEE_PAISE, type SessionName } from "@/lib/constants";

export const dynamic = "force-dynamic";

export default async function BookPage({
  searchParams,
}: {
  searchParams: Promise<{ date?: string; session?: string; time?: string }>;
}) {
  const { date, session, time } = await searchParams;

  if (
    !date?.match(/^\d{4}-\d{2}-\d{2}$/) ||
    !time?.match(/^\d{2}:\d{2}$/) ||
    (session !== "MORNING" && session !== "EVENING")
  ) {
    notFound();
  }

  // Confirm the slot still exists and is free before showing a form the
  // patient would fill in for nothing.
  await connectToDatabase();
  const slot = await SlotModel.findOne({ date, time });

  if (!slot) notFound();

  if (slot.status !== "AVAILABLE") {
    return (
      <>
        <SiteHeader />
        <main className="mx-auto w-full max-w-lg flex-1 px-4 py-8">
          <Card className="flex flex-col items-center gap-4 text-center">
            <h1 className="text-headline-sm font-bold">That time has just been taken</h1>
            <p className="text-body-md text-on-surface-variant">
              Someone booked it moments ago. Please choose another time — there
              are usually others free on the same day.
            </p>
            <Link
              href="/#book"
              className="flex min-h-touch items-center justify-center rounded-card bg-primary px-6 text-label-lg font-semibold text-on-primary"
            >
              See other times
            </Link>
          </Card>
        </main>
      </>
    );
  }

  return (
    <>
      <SiteHeader />
      <main className="mx-auto w-full max-w-lg flex-1 px-4 py-6">
        <Link
          href="/#book"
          className="mb-4 inline-flex min-h-touch items-center text-label-lg font-semibold text-primary"
        >
          ← Change time
        </Link>

        <Card className="flex flex-col gap-6">
          <div className="flex flex-col gap-1">
            <h1 className="text-headline-sm font-bold">Confirm your booking</h1>
            <p className="text-body-md text-on-surface-variant">
              Consultation fee ₹{CONSULTATION_FEE_PAISE / 100}, payable now by
              UPI, card or netbanking.
            </p>
          </div>

          <BookingForm date={date} session={session as SessionName} slotTime={time} />
        </Card>
      </main>
    </>
  );
}
