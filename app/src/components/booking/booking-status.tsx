"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Card } from "@/components/ui/card";
import { ButtonLink } from "@/components/ui/button";
import { formatSlotWithSession, formatSlotWindow } from "@/lib/time";
import { CLINIC } from "@/lib/clinic";
import type { SessionName } from "@/lib/constants";

type Status = {
  status: string;
  tokenNumber: number | null;
  date: string;
  session: SessionName;
  slotTime: string | null;
  patientName: string | null;
  patientPhone: string | null;
  amountPaise: number | null;
  paymentReference: string | null;
};

/** After this long, stop implying the patient should keep waiting. */
const PATIENCE_SECONDS = 20;

/**
 * The three faces of a booking, on one URL.
 *
 * The patient is sent here the instant checkout closes, before anyone knows
 * whether payment succeeded — so this page asks the server rather than
 * assuming. On UPI especially, they may arrive back from their payment app
 * while the webhook is still in flight, and the page must resolve itself the
 * moment it lands rather than looking stuck.
 */
export function BookingStatus({ bookingId, initial }: { bookingId: string; initial: Status }) {
  const [data, setData] = useState(initial);
  const [waited, setWaited] = useState(0);

  const settled = data.status === "CONFIRMED" || data.status === "FAILED";

  useEffect(() => {
    if (settled) return;

    const poll = setInterval(async () => {
      const res = await fetch(`/api/bookings/${bookingId}/status`);
      if (res.ok) setData(await res.json());
    }, 2000);

    const tick = setInterval(() => setWaited((w) => w + 1), 1000);

    return () => {
      clearInterval(poll);
      clearInterval(tick);
    };
  }, [bookingId, settled]);

  if (data.status === "CONFIRMED" && data.tokenNumber !== null) {
    return <Confirmed data={data} />;
  }

  if (data.status === "FAILED") {
    return <Failed />;
  }

  return <Pending waited={waited} phone={data.patientPhone} />;
}

function Confirmed({ data }: { data: Status }) {
  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col items-center gap-2 text-center">
        <span className="flex h-16 w-16 items-center justify-center rounded-full bg-secondary text-on-secondary">
          <svg viewBox="0 0 24 24" fill="currentColor" className="h-9 w-9" aria-hidden="true">
            <path d="M9 16.2 4.8 12l-1.4 1.4L9 19 21 7l-1.4-1.4z" />
          </svg>
        </span>
        <h1 className="text-headline-lg font-bold">Appointment confirmed</h1>
        <p className="text-body-md text-on-surface-variant">
          We&rsquo;ve sent the details to +91 {data.patientPhone}
        </p>
      </div>

      <Card className="flex flex-col gap-4 !p-0 overflow-hidden">
        <div className="bg-primary px-5 py-4 text-on-primary">
          <p className="text-label-md uppercase tracking-wide opacity-80">Your token</p>
          <p className="tabular text-display-lg font-bold leading-none">
            #{data.tokenNumber}
          </p>
        </div>

        <dl className="flex flex-col gap-3 px-5 pb-5">
          <Row label="Patient" value={data.patientName ?? "—"} />
          {data.slotTime && (
            <>
              <Row
                label="Appointment"
                value={formatSlotWithSession(data.slotTime, data.session)}
              />
              <Row label="Window" value={formatSlotWindow(data.slotTime)} tabular />
            </>
          )}
          <Row label="Date" value={data.date} tabular />
          {data.amountPaise && (
            <Row label="Paid" value={`₹${data.amountPaise / 100}`} tabular />
          )}
          {data.paymentReference && (
            <Row label="Reference" value={data.paymentReference} tabular />
          )}
        </dl>
      </Card>

      <Card className="flex flex-col gap-2">
        <h2 className="text-title-md font-semibold">Before you come</h2>
        <ul className="flex list-disc flex-col gap-1.5 pl-5 text-body-md text-on-surface-variant">
          <li>Arrive 10 minutes early for your blood pressure check.</li>
          <li>Bring previous ECG reports, recent blood tests and current medicines.</li>
        </ul>
      </Card>

      <ButtonLink
        variant="secondary"
        href={`tel:${CLINIC.phone.replace(/[^0-9+]/g, "")}`}
        className="w-full"
      >
        Call the clinic · {CLINIC.phone}
      </ButtonLink>
    </div>
  );
}

function Pending({ waited, phone }: { waited: number; phone: string | null }) {
  const takingLong = waited >= PATIENCE_SECONDS;

  return (
    <Card className="flex flex-col items-center gap-4 py-10 text-center">
      <span
        className="h-10 w-10 animate-spin rounded-full border-4 border-surface-container-highest border-t-primary"
        aria-hidden="true"
      />
      <div className="flex flex-col gap-2">
        <h1 className="text-headline-sm font-bold" role="status">
          {takingLong ? "This is taking longer than usual" : "Confirming your payment…"}
        </h1>
        {takingLong ? (
          <p className="text-body-md text-on-surface-variant">
            Your payment is safe and still being processed by your bank.
            <strong className="text-on-surface">
              {" "}
              We&rsquo;ll text your token to +91 {phone} as soon as it&rsquo;s
              confirmed
            </strong>{" "}
            — you can close this page.
          </p>
        ) : (
          <p className="text-body-md text-on-surface-variant">
            This usually takes a few seconds. Please don&rsquo;t close this page.
          </p>
        )}
      </div>

      {takingLong && (
        <ButtonLink
          variant="secondary"
          href={`tel:${CLINIC.phone.replace(/[^0-9+]/g, "")}`}
        >
          Call the clinic · {CLINIC.phone}
        </ButtonLink>
      )}
    </Card>
  );
}

function Failed() {
  return (
    <Card className="flex flex-col items-center gap-4 py-10 text-center">
      <h1 className="text-headline-sm font-bold">Payment didn&rsquo;t go through</h1>
      <p className="text-body-md text-on-surface-variant">
        No money has been deducted. If your bank shows a debit, it will be
        reversed automatically within 5–7 working days.
      </p>
      <Link
        href="/#book"
        className="flex min-h-touch items-center justify-center rounded-card bg-primary px-6 text-label-lg font-semibold text-on-primary"
      >
        Try booking again
      </Link>
    </Card>
  );
}

function Row({ label, value, tabular }: { label: string; value: string; tabular?: boolean }) {
  return (
    <div className="flex items-baseline justify-between gap-4">
      <dt className="text-body-md text-on-surface-variant">{label}</dt>
      <dd className={`text-body-md font-semibold ${tabular ? "tabular" : ""}`}>{value}</dd>
    </div>
  );
}
