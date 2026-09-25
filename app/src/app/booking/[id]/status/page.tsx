import mongoose from "mongoose";
import { notFound } from "next/navigation";
import { SiteHeader } from "@/components/layout/site-header";
import { BookingStatus } from "@/components/booking/booking-status";
import { connectToDatabase } from "@/lib/db/connect";
import { BookingModel } from "@/models/booking";
import { PatientModel } from "@/models/patient";
import { PaymentModel } from "@/models/payment";
import type { SessionName } from "@/lib/constants";

export const dynamic = "force-dynamic";

export default async function StatusPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  if (!mongoose.Types.ObjectId.isValid(id)) notFound();

  await connectToDatabase();
  const booking = await BookingModel.findById(id);
  if (!booking) notFound();

  const patient = await PatientModel.findById(booking.patientId);
  const payment = await PaymentModel.findOne({ bookingId: booking._id });

  return (
    <>
      <SiteHeader />
      <main className="mx-auto w-full max-w-lg flex-1 px-4 py-6">
        <BookingStatus
          bookingId={id}
          initial={{
            status: booking.status,
            tokenNumber: booking.tokenNumber ?? null,
            date: booking.date,
            session: booking.session as SessionName,
            slotTime: booking.slotTime ?? null,
            patientName: patient?.name ?? null,
            patientPhone: patient?.phone ?? null,
            amountPaise: payment?.amountPaise ?? null,
            paymentReference: payment?.razorpayPaymentId ?? null,
          }}
        />
      </main>
    </>
  );
}
