"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { VISIT_CATEGORIES, type SessionName, type VisitCategory } from "@/lib/constants";

const VISIT_LABELS: Record<VisitCategory, string> = {
  FIRST_VISIT: "First visit (ECG & Echo)",
  ROUTINE_FOLLOW_UP: "Routine follow-up",
  POST_PROCEDURE_REVIEW: "Post-procedure review",
  EMERGENCY_TRIAGE: "Urgent — chest pain or breathlessness",
};

/**
 * Registering someone standing at the desk.
 *
 * Payment is marked collected immediately because the patient is physically
 * handing over cash or scanning the counter QR — there is nothing to wait for.
 *
 * When the session is full the form does not simply refuse. A clinic genuinely
 * needs to squeeze people in, so it asks for a reason and records it against
 * the booking. What we are preventing is *silent* overbooking, not the
 * clinical judgement itself.
 */
export function WalkInDialog({
  date,
  session,
  onClose,
  onAdded,
}: {
  date: string;
  session: SessionName;
  onClose: () => void;
  onAdded: () => void;
}) {
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [age, setAge] = useState("");
  const [gender, setGender] = useState<"MALE" | "FEMALE" | "OTHER">("MALE");
  const [visitCategory, setVisitCategory] = useState<VisitCategory>("ROUTINE_FOLLOW_UP");
  const [paymentMethod, setPaymentMethod] = useState<"CASH_AT_DESK" | "UPI_AT_COUNTER">("CASH_AT_DESK");
  const [overrideReason, setOverrideReason] = useState("");
  const [needsOverride, setNeedsOverride] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    setBusy(true);
    setError(null);

    const res = await fetch("/api/staff/walk-in", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name,
        phone,
        age: age ? Number(age) : undefined,
        gender,
        visitCategory,
        paymentMethod,
        date,
        session,
        overrideReason: needsOverride ? overrideReason : undefined,
      }),
    });

    const data = await res.json();
    setBusy(false);

    if (!res.ok) {
      setError(data.error);
      if (data.code === "SESSION_FULL") setNeedsOverride(true);
      return;
    }

    onAdded();
  }

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="walkin-title"
      className="fixed inset-0 z-50 flex items-end justify-center bg-on-surface/40 p-0 sm:items-center sm:p-4"
    >
      <div className="max-h-full w-full max-w-lg overflow-y-auto rounded-t-panel bg-surface-container-lowest p-5 sm:rounded-panel">
        <div className="mb-4 flex items-start justify-between gap-4">
          <h2 id="walkin-title" className="text-headline-sm font-bold">
            Add walk-in patient
          </h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="min-h-touch min-w-touch text-headline-sm text-on-surface-variant"
          >
            ×
          </button>
        </div>

        {error && (
          <p role="alert" className="mb-4 rounded-card bg-error-container px-4 py-3 text-body-md text-on-error-container">
            {error}
          </p>
        )}

        <form className="flex flex-col gap-4" onSubmit={submit}>
          <Field label="Patient name" htmlFor="wi-name">
            <input id="wi-name" required minLength={2} value={name} onChange={(e) => setName(e.target.value)} className={input} />
          </Field>

          <div className="grid grid-cols-2 gap-3">
            <Field label="Mobile" htmlFor="wi-phone">
              <input
                id="wi-phone"
                required
                inputMode="numeric"
                pattern="[6-9][0-9]{9}"
                maxLength={10}
                value={phone}
                onChange={(e) => setPhone(e.target.value.replace(/\D/g, ""))}
                className={`${input} tabular`}
              />
            </Field>
            <Field label="Age" htmlFor="wi-age">
              <input id="wi-age" type="number" min={0} max={120} value={age} onChange={(e) => setAge(e.target.value)} className={input} />
            </Field>
          </div>

          <Field label="Gender" htmlFor="wi-gender">
            <select id="wi-gender" value={gender} onChange={(e) => setGender(e.target.value as typeof gender)} className={input}>
              <option value="MALE">Male</option>
              <option value="FEMALE">Female</option>
              <option value="OTHER">Other</option>
            </select>
          </Field>

          <Field label="Reason for visit" htmlFor="wi-visit">
            <select id="wi-visit" value={visitCategory} onChange={(e) => setVisitCategory(e.target.value as VisitCategory)} className={input}>
              {VISIT_CATEGORIES.map((c) => (
                <option key={c} value={c}>{VISIT_LABELS[c]}</option>
              ))}
            </select>
          </Field>

          <Field label="Payment collected" htmlFor="wi-pay">
            <select id="wi-pay" value={paymentMethod} onChange={(e) => setPaymentMethod(e.target.value as typeof paymentMethod)} className={input}>
              <option value="CASH_AT_DESK">Cash at desk — ₹500</option>
              <option value="UPI_AT_COUNTER">UPI at counter — ₹500</option>
            </select>
          </Field>

          {needsOverride && (
            <Field
              label="Reason for exceeding capacity"
              htmlFor="wi-override"
              hint="Recorded against this booking."
            >
              <input
                id="wi-override"
                required
                minLength={3}
                value={overrideReason}
                onChange={(e) => setOverrideReason(e.target.value)}
                className={input}
                placeholder="e.g. Referred urgent case"
              />
            </Field>
          )}

          <div className="flex gap-3 pt-1">
            <Button type="button" variant="secondary" onClick={onClose} className="flex-1">
              Cancel
            </Button>
            <Button type="submit" disabled={busy} className="flex-1">
              {busy ? "Adding…" : needsOverride ? "Add anyway" : "Add & issue token"}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}

const input =
  "min-h-touch w-full rounded-card bg-surface-container-low px-4 text-body-lg text-on-surface";

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
      <label htmlFor={htmlFor} className="text-label-lg font-semibold">{label}</label>
      {children}
      {hint && <p className="text-body-sm text-on-surface-variant">{hint}</p>}
    </div>
  );
}
