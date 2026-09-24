import Image from "next/image";
import { SiteHeader } from "@/components/layout/site-header";
import { SlotPicker } from "@/components/booking/slot-picker";
import { Card, Pill } from "@/components/ui/card";
import { ButtonLink } from "@/components/ui/button";
import { upcomingDays, availabilityForDates } from "@/lib/slots/availability";
import { formatSessionHours } from "@/lib/time";
import {
  CLINIC,
  DOCTOR,
  MEMBERSHIPS,
  THESIS,
  PUBLICATIONS,
} from "@/lib/clinic";

/** Availability changes constantly, so never serve this page from cache. */
export const dynamic = "force-dynamic";

const DIAGNOSTICS = [
  {
    name: "2D Echocardiography",
    detail:
      "High-resolution cardiac structural evaluation and Doppler study for chamber, valve and ejection fraction assessment.",
  },
  {
    name: "Treadmill Stress Testing (TMT)",
    detail:
      "Exercise tolerance protocols for early detection of ischaemic heart disease and coronary artery disease.",
  },
  {
    name: "Ambulatory BP Monitoring (ABPM)",
    detail:
      "24-hour continuous blood pressure tracking to identify nocturnal dip abnormalities and white-coat spikes.",
  },
  {
    name: "Preventive Internal Medicine",
    detail:
      "Management of complicated diabetes, metabolic syndrome, dyslipidaemia and adult multisystem health.",
  },
];

const AFFILIATIONS = [
  { hospital: "Vishesh Jupiter Hospital", area: "Ring Road, Indore", role: "Senior Consultant – Physician" },
  { hospital: "Gita Bhawan Hospital", area: "Manorama Ganj, Indore", role: "Consultant Physician & Ex-ICU In-charge" },
  { hospital: "DNS Hospital", area: "A.B. Road, Indore", role: "Visiting Senior Clinical Advisor" },
];

export default async function HomePage() {
  const days = upcomingDays(6);
  const slotsByDate = await availabilityForDates(days.map((d) => d.date));

  return (
    <>
      <SiteHeader />

      <main className="mx-auto w-full max-w-4xl flex-1 px-4 pb-24 pt-6">
        {/* ---- Doctor ------------------------------------------------- */}
        <section className="flex flex-col gap-5" aria-labelledby="doctor-heading">
          <div className="flex items-start gap-4">
            <Image
              src="/brand/doctor.jpg"
              alt={`Portrait of ${DOCTOR.name}`}
              width={104}
              height={104}
              priority
              className="h-24 w-24 shrink-0 rounded-panel object-cover sm:h-28 sm:w-28"
            />
            <div className="flex min-w-0 flex-col gap-1">
              <h1
                id="doctor-heading"
                className="text-headline-lg font-bold text-on-surface"
              >
                {DOCTOR.name}
              </h1>
              <p className="text-title-md font-semibold text-primary">
                {DOCTOR.qualifications}
              </p>
              <p className="text-body-md text-on-surface-variant">
                {DOCTOR.title}
              </p>
            </div>
          </div>

          <ul className="flex flex-wrap gap-2" aria-label="Professional memberships">
            {MEMBERSHIPS.map((m) => (
              <li key={m.short}>
                <Pill tone="primary">
                  <span>{m.short}</span>
                  <span className="tabular font-normal opacity-80">
                    since {m.since}
                  </span>
                </Pill>
              </li>
            ))}
          </ul>
        </section>

        {/* ---- Booking ------------------------------------------------ */}
        <section className="mt-8 scroll-mt-20" id="book" aria-labelledby="book-heading">
          <Card className="flex flex-col gap-6">
            <div className="flex flex-col gap-1">
              <h2 id="book-heading" className="text-headline-sm font-bold">
                Book an OPD consultation
              </h2>
              <p className="text-body-md text-on-surface-variant">
                Pay online and arrive with a confirmed token — no waiting in the
                queue for registration.
              </p>
            </div>
            <SlotPicker days={days} slotsByDate={slotsByDate} />
          </Card>
        </section>

        {/* ---- Diagnostics -------------------------------------------- */}
        <section className="mt-10 flex flex-col gap-4" aria-labelledby="diagnostics-heading">
          <div className="flex flex-col gap-1">
            <h2 id="diagnostics-heading" className="text-headline-sm font-bold">
              Clinical focus &amp; diagnostics
            </h2>
            <p className="text-body-md text-on-surface-variant">
              Non-invasive cardiac testing performed on site.
            </p>
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            {DIAGNOSTICS.map((d) => (
              <Card key={d.name} as="article" className="flex flex-col gap-1.5">
                <h3 className="text-title-md font-semibold">{d.name}</h3>
                <p className="text-body-sm text-on-surface-variant">{d.detail}</p>
              </Card>
            ))}
          </div>
        </section>

        {/* ---- Affiliations ------------------------------------------- */}
        <section className="mt-10 flex flex-col gap-4" aria-labelledby="affiliations-heading">
          <h2 id="affiliations-heading" className="text-headline-sm font-bold">
            Hospital affiliations
          </h2>
          <div className="grid gap-3 sm:grid-cols-3">
            {AFFILIATIONS.map((a) => (
              <Card key={a.hospital} as="article" className="flex flex-col gap-1">
                <h3 className="text-title-md font-semibold">{a.hospital}</h3>
                <p className="text-label-lg font-medium text-primary">{a.area}</p>
                <p className="text-body-sm text-on-surface-variant">{a.role}</p>
              </Card>
            ))}
          </div>
        </section>

        {/* ---- Research ----------------------------------------------- */}
        <section className="mt-10 flex flex-col gap-4" aria-labelledby="research-heading">
          <h2 id="research-heading" className="text-headline-sm font-bold">
            Research &amp; publications
          </h2>

          <Card className="flex flex-col gap-2">
            <div className="flex flex-wrap items-center gap-2">
              <Pill tone="warning">Thesis</Pill>
              <span className="tabular text-label-lg text-on-surface-variant">
                {THESIS.period}
              </span>
            </div>
            <h3 className="text-title-lg font-semibold">{THESIS.title}</h3>
          </Card>

          <ul className="grid gap-3 sm:grid-cols-2">
            {PUBLICATIONS.map((p) => (
              <li key={p.title}>
                <Card as="article" className="flex h-full flex-col gap-2">
                  <div className="flex flex-wrap items-center gap-2">
                    <Pill>{p.journal}</Pill>
                    {"year" in p && (
                      <span className="tabular text-label-lg text-on-surface-variant">
                        {p.year}
                      </span>
                    )}
                    {"note" in p && (
                      <span className="text-label-lg text-on-surface-variant">
                        {p.note}
                      </span>
                    )}
                  </div>
                  <h3 className="text-title-md font-semibold">{p.title}</h3>
                </Card>
              </li>
            ))}
          </ul>
        </section>

        {/* ---- Visiting ----------------------------------------------- */}
        <section className="mt-10 flex flex-col gap-4" aria-labelledby="visit-heading">
          <h2 id="visit-heading" className="text-headline-sm font-bold">
            Visiting the clinic
          </h2>
          <div className="grid gap-3 sm:grid-cols-2">
            <Card className="flex flex-col gap-3">
              <h3 className="text-title-md font-semibold">OPD hours</h3>
              <dl className="flex flex-col gap-2 text-body-md">
                <div className="flex items-baseline justify-between gap-4">
                  <dt className="text-on-surface-variant">Monday – Saturday</dt>
                  <dd className="sr-only">See session times below</dd>
                </div>
                <div className="flex items-baseline justify-between gap-4">
                  <dt className="text-on-surface-variant">Morning</dt>
                  <dd className="tabular font-semibold">
                    {formatSessionHours("MORNING")}
                  </dd>
                </div>
                <div className="flex items-baseline justify-between gap-4">
                  <dt className="text-on-surface-variant">Evening</dt>
                  <dd className="tabular font-semibold">
                    {formatSessionHours("EVENING")}
                  </dd>
                </div>
              </dl>
              <p className="text-body-sm font-medium text-error">
                Sunday — emergency referrals only
              </p>
            </Card>

            <Card className="flex flex-col gap-3">
              <h3 className="text-title-md font-semibold">Address</h3>
              <address className="not-italic text-body-md text-on-surface-variant">
                {CLINIC.addressLines.map((line) => (
                  <span key={line} className="block">
                    {line}
                  </span>
                ))}
              </address>
              <ButtonLink
                variant="secondary"
                href={`tel:${CLINIC.phone.replace(/[^0-9+]/g, "")}`}
                className="tabular mt-auto w-full"
              >
                {CLINIC.phone}
              </ButtonLink>
            </Card>
          </div>
        </section>
      </main>

      {/* ---- Sticky booking bar --------------------------------------
          Booking stays one tap away at any scroll depth. The credentials
          sections are long, and a returning patient should never have to
          scroll back up to do the one thing they came for.              */}
      <div className="fixed inset-x-0 bottom-0 z-40 border-t border-outline-variant/40 bg-surface-container-lowest/95 px-4 py-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] backdrop-blur">
        <div className="mx-auto w-full max-w-4xl">
          <ButtonLink href="#book" size="lg" className="w-full">
            Book an appointment
          </ButtonLink>
        </div>
      </div>
    </>
  );
}
