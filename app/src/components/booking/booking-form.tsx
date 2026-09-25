"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Script from "next/script";
import { Button } from "@/components/ui/button";
import { formatSlotWithSession, formatSlotWindow } from "@/lib/time";
import { VISIT_CATEGORIES, type SessionName, type VisitCategory } from "@/lib/constants";

const VISIT_LABELS: Record<VisitCategory, string> = {
  FIRST_VISIT: "First visit (ECG & Echo)",
  ROUTINE_FOLLOW_UP: "Routine follow-up",
  POST_PROCEDURE_REVIEW: "Post-procedure review",
  EMERGENCY_TRIAGE: "Urgent — chest pain or breathlessness",
};

type Step = "DETAILS" | "OTP" | "PAYING";

declare global {
  interface Window {
    Razorpay?: new (options: Record<string, unknown>) => { open: () => void };
  }
}

export function BookingForm({
  date,
  session,
  slotTime,
}: {
  date: string;
  session: SessionName;
  slotTime: string;
}) {
  const router = useRouter();
  const [step, setStep] = useState<Step>("DETAILS");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const [name, setName] = useState("");
  const [age, setAge] = useState("");
  const [gender, setGender] = useState<"MALE" | "FEMALE" | "OTHER">("MALE");
  const [phone, setPhone] = useState("");
  const [visitCategory, setVisitCategory] = useState<VisitCategory>("ROUTINE_FOLLOW_UP");
  const [code, setCode] = useState("");

  async function requestCode() {
    setError(null);
    setBusy(true);
    const res = await fetch("/api/otp/request", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ phone }),
    });
    const data = await res.json();
    setBusy(false);

    if (!res.ok) return setError(data.error);
    setStep("OTP");
  }

  async function verifyAndPay() {
    setError(null);
    setBusy(true);

    const verify = await fetch("/api/otp/verify", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ phone, code }),
    });
    const verifyData = await verify.json();
    if (!verify.ok) {
      setBusy(false);
      return setError(verifyData.error);
    }

    // Claiming the slot happens here, server-side, before Razorpay opens. If
    // someone else took it while this patient was typing their code, they find
    // out now — with alternatives still available — rather than after paying.
    const hold = await fetch("/api/bookings/hold", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        phone,
        name,
        age: age ? Number(age) : undefined,
        gender,
        date,
        session,
        slotTime,
        visitCategory,
      }),
    });
    const holdData = await hold.json();
    setBusy(false);

    if (!hold.ok) {
      setError(holdData.error);
      if (holdData.code === "SLOT_UNAVAILABLE") {
        setTimeout(() => router.push("/"), 2500);
      }
      return;
    }

    setStep("PAYING");
    openRazorpay(holdData);
  }

  function openRazorpay(hold: {
    bookingId: string;
    orderId: string;
    amountPaise: number;
    razorpayKeyId: string;
  }) {
    if (!window.Razorpay) {
      setError("Payment system is still loading. Please try again in a moment.");
      setStep("OTP");
      return;
    }

    const checkout = new window.Razorpay({
      key: hold.razorpayKeyId,
      amount: hold.amountPaise,
      currency: "INR",
      name: "Dr. Ashok Sethia Clinic",
      description: "OPD consultation",
      order_id: hold.orderId,
      prefill: { name, contact: phone },
      // No display config: referencing blocks without defining them produced
      // an invalid shape that Razorpay silently ignored. Its default ordering
      // already surfaces UPI first in India, once UPI is enabled on the
      // account (Dashboard > Settings > Configuration > Payment Methods).
      theme: { color: "#006194" },
      handler: () => {
        // The browser's word is never trusted as proof of payment — the status
        // page asks the server, which relies on Razorpay's webhook. This only
        // moves the patient to the page that will tell them the truth.
        router.push(`/booking/${hold.bookingId}/status`);
      },
      modal: {
        // Dismissing the sheet is not a failure; the hold is still theirs for
        // the remainder of the ten minutes, so send them somewhere that says so.
        ondismiss: () => router.push(`/booking/${hold.bookingId}/status`),
      },
    });

    checkout.open();
  }

  return (
    <>
      <Script src="https://checkout.razorpay.com/v1/checkout.js" strategy="afterInteractive" />

      <div className="flex flex-col gap-6">
        {/* Chosen slot, always visible so the patient can confirm at a glance. */}
        <div className="rounded-card bg-primary-fixed p-4 text-on-primary-fixed">
          <p className="text-label-md font-semibold uppercase tracking-wide opacity-80">
            Your appointment
          </p>
          <p className="mt-1 text-title-lg font-bold">
            {formatSlotWithSession(slotTime, session)}
          </p>
          <p className="tabular text-body-sm opacity-90">
            {formatSlotWindow(slotTime)} · {date}
          </p>
        </div>

        {error && (
          <p
            role="alert"
            className="rounded-card bg-error-container px-4 py-3 text-body-md text-on-error-container"
          >
            {error}
          </p>
        )}

        {step === "DETAILS" && (
          <form
            className="flex flex-col gap-4"
            onSubmit={(e) => {
              e.preventDefault();
              requestCode();
            }}
          >
            <Field label="Patient name" htmlFor="name">
              <input
                id="name"
                required
                minLength={2}
                value={name}
                onChange={(e) => setName(e.target.value)}
                autoComplete="name"
                className={inputClass}
                placeholder="Full name"
              />
            </Field>

            <div className="grid grid-cols-2 gap-3">
              <Field label="Age" htmlFor="age">
                <input
                  id="age"
                  type="number"
                  min={0}
                  max={120}
                  value={age}
                  onChange={(e) => setAge(e.target.value)}
                  className={inputClass}
                  placeholder="58"
                />
              </Field>
              <Field label="Gender" htmlFor="gender">
                <select
                  id="gender"
                  value={gender}
                  onChange={(e) => setGender(e.target.value as typeof gender)}
                  className={inputClass}
                >
                  <option value="MALE">Male</option>
                  <option value="FEMALE">Female</option>
                  <option value="OTHER">Other</option>
                </select>
              </Field>
            </div>

            <Field label="Reason for visit" htmlFor="visit">
              <select
                id="visit"
                value={visitCategory}
                onChange={(e) => setVisitCategory(e.target.value as VisitCategory)}
                className={inputClass}
              >
                {VISIT_CATEGORIES.map((c) => (
                  <option key={c} value={c}>
                    {VISIT_LABELS[c]}
                  </option>
                ))}
              </select>
            </Field>

            <Field label="Mobile number" htmlFor="phone" hint="We'll text your token here">
              <div className="flex items-stretch gap-2">
                <span className="flex min-h-touch items-center rounded-card bg-surface-container px-3 text-title-md font-semibold">
                  +91
                </span>
                <input
                  id="phone"
                  required
                  inputMode="numeric"
                  pattern="[6-9][0-9]{9}"
                  maxLength={10}
                  value={phone}
                  onChange={(e) => setPhone(e.target.value.replace(/\D/g, ""))}
                  autoComplete="tel-national"
                  className={`${inputClass} tabular flex-1`}
                  placeholder="10-digit mobile"
                />
              </div>
            </Field>

            <Button type="submit" size="lg" disabled={busy || phone.length !== 10 || name.length < 2}>
              {busy ? "Sending code…" : "Send verification code"}
            </Button>
          </form>
        )}

        {step === "OTP" && (
          <form
            className="flex flex-col gap-4"
            onSubmit={(e) => {
              e.preventDefault();
              verifyAndPay();
            }}
          >
            <Field
              label="Verification code"
              htmlFor="code"
              hint={`Sent to +91 ${phone}`}
            >
              <input
                id="code"
                required
                inputMode="numeric"
                pattern="[0-9]{6}"
                maxLength={6}
                value={code}
                onChange={(e) => setCode(e.target.value.replace(/\D/g, ""))}
                autoComplete="one-time-code"
                autoFocus
                className={`${inputClass} tabular text-center text-headline-md tracking-[0.5em]`}
                placeholder="000000"
              />
            </Field>

            <Button type="submit" size="lg" disabled={busy || code.length !== 6}>
              {busy ? "Verifying…" : "Verify and pay ₹500"}
            </Button>

            <button
              type="button"
              onClick={() => {
                setStep("DETAILS");
                setCode("");
                setError(null);
              }}
              className="min-h-touch text-label-lg font-semibold text-primary underline"
            >
              Change number
            </button>
          </form>
        )}

        {step === "PAYING" && (
          <p className="rounded-card bg-surface-container-low px-4 py-8 text-center text-body-md text-on-surface-variant">
            Opening secure payment…
          </p>
        )}
      </div>
    </>
  );
}

const inputClass =
  "min-h-touch w-full rounded-card bg-surface-container-low px-4 text-body-lg " +
  "text-on-surface placeholder:text-outline focus:bg-surface-container-lowest";

function Field({
  label,
  htmlFor,
  hint,
  children,
}: {
  label: string;
  htmlFor: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex flex-col gap-1.5">
      <label htmlFor={htmlFor} className="text-label-lg font-semibold text-on-surface">
        {label}
      </label>
      {children}
      {hint && <p className="text-body-sm text-on-surface-variant">{hint}</p>}
    </div>
  );
}
