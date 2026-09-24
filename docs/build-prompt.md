# Dr. Ashok Sethia Clinic App — Phase 1 Build Spec

**Status:** Locked 2026-09-24. This supersedes the original pre-architecture version of this prompt.
**Authority:** Where this document, the Stitch blueprints, or any older note disagree — **this document wins.**

---

## 0. HOW TO USE THIS DOCUMENT

The audit phase is complete. The UI/UX blueprints in `ui-blueprints/` have been reviewed screen by screen, the architecture has been decided, and the gap list is recorded below. This is now a **build spec**, not an audit request.

Do not re-audit. Build against Sections 3–8, respecting the constraints in Section 9.

---

## 1. PROJECT CONTEXT

A web application for **Dr. Ashok Sethia**, Senior Consultant Physician & Cardiologist, Indore — **Phase 1** of a 3-phase project. Booking + payment + clinic information system. Real client work.

Design source: `ui-blueprints/stitch_appointement_booking_application_for_clinic 5/` — 4 screens plus a `DESIGN.md` design system, generated in Google Stitch. The blueprints are **visual reference only**; their JavaScript is throwaway demo code and must not be carried into the build.

---

## 2. ⚠️ CONTENT ACCURACY — LAUNCH BLOCKER

**The Stitch design contains credential claims that were not supplied by the client and may be AI-generated filler. These must be confirmed with Dr. Sethia before anything ships.**

### Verified client background
- Life Member, **Cardiological Society of India** — since **1991**
- Life Member, **Association of Physicians of India** — since **1993**
- Life Member, **Indian Academy of Echocardiography** — since **2001**
- **Thesis:** *Cardiovascular Diseases in Tribals of Jhabua* — **1985–87**
- **Publication:** *Pneumomediastinum – A Clinical Dilemma* — **JAPI 1996**
- **Publication:** *Ebstein's Anomaly in Adults & Adolescents – Follow Up Series from Central India* — case series, JAPI

### Unverified — do not publish without confirmation
| Claim in the design | Risk |
|---|---|
| "MP Medical Council Reg **#6421**" | **Highest.** A specific registration number with no known source. |
| "Associate, **American College of Cardiology (ACC)**" | Not in the client's membership list. |
| "**40+ Years** Clinical Excellence" | Plausible, unconfirmed. |
| Clinic name, address, phone | Unconfirmed. |

### Factual error to correct
The design presents the **Jhabua thesis** as if published in **JAPI 1996**. That merges two separate works — the thesis is 1985–87; JAPI 1996 belongs to *Pneumomediastinum*. Both real publications are **missing from the design entirely**.

**Rebuild the Academic section** with thesis and publications as separate, correctly dated entries, and add the membership years.

---

## 3. LOCKED ARCHITECTURE

### 3.1 Booking model — time-slot based
- Discrete time slots. **Not** pool-based capacity.
- **12-minute slots → 15 appointments per 3-hour session.**
- Morning OPD 10:00 AM – 1:00 PM · Evening OPD 5:00 PM – 8:00 PM · Mon–Sat.
- The slot grid **is** the capacity — there is no separate cap number.
- Token pass window text reads e.g. **"5:30 – 5:42 PM"**.
- **Open:** whether a first visit (ECG/Echo) should consume two consecutive slots. Needs Dr. Sethia's real per-visit-type timings.

### 3.2 Tokens — two separate fields
| Field | Behaviour |
|---|---|
| `token_number` | Assigned **at CONFIRMED**, never at lock time. Permanent for the day. Printed on the pass. **Never renumbered.** A cancelled token stays permanently CANCELLED. |
| `queue_position` | Separate, staff-reorderable. Drives actual serving order — emergencies, late arrivals, no-shows, walk-ins who are physically present ahead of their number. |

- Walk-ins get the next sequential number for the session regardless of cancellations.
- Patient-facing wait estimates are computed from `queue_position`, **never** `token_number`.
- **Unresolved:** Morning #08 and Evening #08 collide. Needs a session prefix (`M-08` / `E-08`) or day-continuous numbering.

### 3.3 Concurrency — the soft lock
```
1. Patient picks slot                 → UI only, nothing reserved
2. Phone → OTP → verified             → now a known real person
3. Re-check slot availability         → if gone, offer alternatives, stop
4. ATOMIC: capacity check + insert    → status = PENDING_PAYMENT, 10-min lock
5. Create Razorpay order              → amount set SERVER-SIDE, never from client
6. Razorpay checkout opens
```
- **10-minute lock**, taken *before* the payment screen opens.
- Lock lapses with **no payment attempt** → release. Payment **genuinely in flight** at the bank → **extend, do not release.**
- **Atomicity is enforced by the database, not by application logic.** Slots are materialised one document per slot per day and claimed with a single atomic `findOneAndUpdate` filtered on `status: "AVAILABLE"`. If two requests race, exactly one wins and the other receives `null` — before any money moves.
- Hard backstop: a **unique partial index** on `{date, time}` filtered to held slots, so a double-booking is physically impossible even if application code has a bug.
- Capacity overrides sit **outside** the slot grid (`isOverflow: true`, excluded from that index) and queue at the end — an emergency walk-in does not get a named slot.
- **The walk-in/desk flow must use the same atomic path.** A deliberate, logged "Override capacity" option is permitted; silent overbooking is not.

### 3.4 Payments — Razorpay
> **The webhook is the source of truth. The browser redirect is UX only. Neither is trusted alone.**

- Signature verified on **both** paths. A browser claiming "success" is never sufficient.
- Redirect goes to a **state-aware status page** (`/booking/{id}/status`) with three faces: **CONFIRMED** (token pass) / **PENDING** / **FAILED**.
- **Three idempotent confirmation paths**, keyed on Razorpay `payment_id`:
  1. Webhook (push) — primary, usually arrives first
  2. API-verify on status-page load (pull)
  3. Background reconciliation sweep, ~every 2 min (pull)
- Patient is redirected **immediately, always** — never held waiting on the gateway.
- **20-second escalation** on the pending screen → "Your ₹500 is safe. We'll SMS your token — you can close this page."
- **Late success rule:** capacity exists → honour it, assign token, SMS. Capacity gone → **auto-refund + SMS**. Never silent.
- Payment record needs a `method` field: `RAZORPAY_ONLINE | CASH_AT_DESK | UPI_AT_COUNTER` — the admin revenue split depends on it.
- Refunds are **staff-triggered** in Phase 1.

### 3.5 Booking status lifecycle
```
                    ┌─→ EXPIRED   (lock lapsed, no payment attempted)
                    │
PENDING_PAYMENT ────┼─→ FAILED    (declined → retry offered, slot briefly held)
                    │
                    └─→ CONFIRMED → ARRIVED → IN_CONSULTATION → COMPLETED
                             │
                             └─→ CANCELLED → REFUNDED
```
`PAYMENT_IN_FLIGHT` flags a payment moving at the bank and holds the lock open.

### 3.6 Live updates — one shared endpoint
**One** polled status endpoint (~5s) carries **all** of: admin queue updates, "Now Serving" on patient token passes, the in-cabin timer, and the Buzzer Alert. Do not build these as separate mechanisms.

- At ~30 patients/day this is not a realtime-infrastructure problem. Polling removes an always-on WebSocket service from the architecture. MongoDB Change Streams remain available if the clinic outgrows it.
- The buzzer must ring on the **doctor's** machine, not the machine that clicked it. A local HTML5 audio chime plays only on the clicking computer — so the buzzer is a server-side flag the doctor's screen picks up on its next poll.
- The doctor's screen needs one interaction (a "Start Session" click) to unlock browser audio.

---

## 3.7 TECH STACK (locked 2026-09-24)

| Layer | Choice |
|---|---|
| Framework | Next.js 15 + TypeScript (App Router, `src/`) |
| Database | **MongoDB Atlas** — Mumbai `ap-south-1` |
| ODM | Mongoose |
| Styling | Tailwind CSS |
| Realtime | **Polling** (~5s) via one shared status endpoint — carries queue, "Now Serving" and buzzer |
| Auth | Auth.js — staff credentials + patient phone OTP |
| Payments | Razorpay Node SDK; webhook as a Next.js route handler |
| SMS | MSG91 (India DLT-compliant) |
| Jobs | Vercel Cron — reconciliation sweep, lock expiry |
| Testing | Vitest — concurrency/locking logic especially |
| Hosting | Vercel |

**Why MongoDB is fine here.** The requirement was atomicity, not SQL. Slots are materialised one document per slot per day and claimed with a single atomic `findOneAndUpdate` filtered on `status: "AVAILABLE"` — if two requests race, exactly one wins and the other gets `null`, before any money moves. A **unique partial index** on `{date, time}` filtered to held slots is the hard backstop. Atlas runs a replica set, so multi-document transactions are available where booking + payment must be written together.

**Why polling, not WebSockets.** ~30 patients/day is not a realtime-infrastructure problem. One polled status endpoint removes an always-on WebSocket service from the architecture. MongoDB Change Streams remain available if the clinic outgrows it.

**⚠️ SMS lead time.** India's TRAI rules require **DLT registration** of the sender ID and every message template before transactional SMS can be sent. This takes days to weeks. Token delivery depends on it — start the registration in parallel with the build, not after.

---

## 4. PHASE 1 FEATURE CHECKLIST

### A. Public site / doctor profile
- [ ] Hero with clear "Book Appointment" CTA
- [ ] **Sticky "Book Appointment" bar** — booking always one tap away at any scroll position
- [ ] Doctor bio, qualifications, experience
- [ ] Accreditations — CSI 1991, API 1993, IAE 2001 (**with years**)
- [ ] Clinical Focus & Diagnostics
- [ ] Hospital Affiliations & Clinical Leadership
- [ ] **Academic section rebuilt** — thesis and both publications, separate and correctly dated (see §2)
- [ ] Clinic address, map, contact number
- [ ] OPD days & timings
- [ ] **Inquiry form** — name, phone, message → notifies clinic. Must work **independently of booking**; a visitor with no booking intent can still ask a question.

### B. Booking flow
- [ ] Date selection
- [ ] Morning/evening session selection
- [ ] Slot grid showing **available vs booked vs sold-out** states
- [ ] **"Only N slots left"** scarcity indicator
- [ ] Mobile number input
- [ ] **OTP entry screen** — the blueprint has a "Send OTP" button with nowhere to type the code
- [ ] Consultation fee shown before payment (₹500)
- [ ] "Proceed to Pay" → checkout

### C. Checkout
- [ ] Booking summary (doctor, date, slot, fee)
- [ ] Razorpay: UPI / cards / netbanking
- [ ] Trust and security indicators
- [ ] **Payment pending state** with 20-second escalation
- [ ] **Payment failed state** with retry + remaining lock countdown
- [ ] **Slot-lost state** — refund notice + alternative slots

### D. Confirmation / token pass
- [ ] Token number, date, consultation window
- [ ] **Live day-of states** — the pass changes over time; on the appointment day, live queue position becomes the hero ("Now serving #05, you're #08 — leave in 20 minutes")
- [ ] Add to calendar / download slip
- [ ] Clinic address + maps
- [ ] SMS confirmation messaging
- [ ] Reschedule/cancel path (**not** a JS `alert()`)
- [ ] **"Add to Home Screen"** prompt

### E. Patient account
- [ ] **Patient login** — phone + OTP (**in Phase 1**)
- [ ] **Token & Visits** tab — current and past appointments, with empty state
- [ ] Returning-patient recognition — "book again" shortcut

### F. Admin portal — **two roles from day one**
- [ ] Separate staff login, not linked from any patient-facing page
- [ ] **Receptionist view** — queue, billing, walk-in registration, check-in
- [ ] **Doctor view** — chamber/consultation view
- [ ] Live token queue with status per patient
- [ ] Billing view — payment status and amount per patient
- [ ] Reschedule / cancel / mark complete / mark no-show
- [ ] Walk-in registration — **using the shared atomic capacity check**, with logged capacity override
- [ ] **"Payments needing attention"** panel — human backstop for unreconciled payments
- [ ] **Slot Roster Admin** — slot grid, session times, capacity, **holidays and doctor leave**. Not optional: without it the slot system cannot be administered.
- [ ] Buzzer Alert (server push, see §3.6)
- [ ] Checkout Token → COMPLETED, auto-load next ARRIVED patient
- [ ] Print queue sheet (needs a **print stylesheet** — `window.print()` alone prints the whole dashboard) + CSV export
- [ ] Stat cards computed live: total patients, paid online, walk-ins, revenue (online/cash split)

### G. Cross-cutting
- [ ] Mobile-first — patients book from phones
- [ ] **Admin must work on smaller screens too** — the 8-column queue table currently overflows; reception often uses older monitors
- [ ] Empty, loading and error states everywhere — not just the happy path
- [ ] **Accessibility (see §5) — this is the largest single gap in the current design**
- [ ] No admin routes or links exposed in patient-facing navigation
- [ ] **English only**

---

## 5. ACCESSIBILITY — MANDATORY

The users are **55–75-year-old cardiac patients**, many with diabetic retinopathy (which specifically degrades fine-detail vision) and tremor (beta blockers are common).

`DESIGN.md` promises senior accessibility; the blueprints do not deliver it.

| Issue | Current | Required |
|---|---|---|
| Minimum text size | **11px** (`label-sm`) carrying real content — OPD timings, council number, patient details on the token pass, wait estimate | **14px floor** for anything a patient reads; **16px** body. 11–12px for decorative labels only. |
| Slot pill height | ~40px, 3-column grid, 8px gaps | **48px minimum**; **2-column grid** on narrow phones |
| Button height | Varies | 48px minimum (already in `DESIGN.md` — enforce it) |

---

## 6. DESIGN SYSTEM — RESOLVE BEFORE BUILDING

`DESIGN.md` **contradicts itself.** Its prose and its actual tokens specify two different palettes:

| | Prose section says | Frontmatter + every `code.html` uses |
|---|---|---|
| Primary | `#0284c7` | `#006194` |
| Secondary | `#10b981` | `#006c49` |
| Surface | `#f8fafc` | `#faf8ff` |
| Radius | `lg: 1rem` / `xl: 1.5rem` | `lg: 0.5rem` / `xl: 0.75rem` |

The approved PNG renders reflect the **code** palette, so the prose is likely the stale half — **but this is the client's call.** Also: the admin portal uses a `title-sm` token that is never defined in the type scale.

Pick one palette, make `DESIGN.md` and the token layer agree, then build components.

`darkMode: "class"` is set in every Tailwind config but **zero** `dark:` classes exist. `DESIGN.md` states light-only is intentional — delete the dead config.

---

## 7. ASSETS — ⚠️ ALL PLACEHOLDERS, NONE SHIP

**Done 2026-09-24:** all four images were rescued from Stitch's expiring CDN into `ui-blueprints/stitch_.../assets/`, and every HTML file now points at the local copies. The expiry risk is closed.

**What the rescue revealed is a launch blocker of its own — every image is AI-generated filler:**

| File | What it actually is |
|---|---|
| `placeholder-logo.jpg` | Generic stock logo reading **"CARDIOLOGY & PHYSICIAN ASSOCIATES"** — a fictional practice, not Dr. Sethia's branding. Appears on all 4 screens. |
| `placeholder-doctor-home.jpg` | An AI-generated man. Not Dr. Sethia. |
| `placeholder-doctor-checkout.jpg` | A **different** AI-generated man, also captioned as Dr. Sethia. |
| `placeholder-doctor-admin.jpg` | A **third** AI-generated man, whose desk nameplate visibly reads **"DR. RAJIV KAPOOR, CARDIOLOGIST"**. |

Three fabricated faces are presented as the same real, named physician, and one carries a different doctor's name on screen. Publishing an AI-generated face captioned "Dr. Ashok Sethia" on a real medical site is misrepresentation — patients would reasonably believe that is their doctor.

**Required from the client:** real clinic logo, one real photograph of Dr. Sethia used consistently, and confirmation of the clinic's registered name.

See `ui-blueprints/.../assets/README.md`.

---

## 8. CONTENT TO WRITE

SMS templates — patient-facing copy, not to be improvised at build time:
- Token confirmation
- Late-payment auto-refund
- Reschedule confirmation
- Appointment reminder

---

## 9. CONSTRAINTS

### Cut from Phase 1 — do not build
- **Diagnostics & ECG**, **Hospital Inpatients**, **Rx & Directives** (admin sidebar sections)
- The **vitals telemetry panel** in the chamber view (BP, pulse, SpO2, glucose, ECG trace) and "Doctor Directives Ordered" — with Rx & Directives cut, **nobody enters this data**. Either it becomes a small manual-entry form for the nurse, or it comes out. Do not build it displaying data from nowhere.

### Deferred to Phase 2/3 — do not add
Automated reminders, reviews, CRM, AI chatbot, telemedicine, EHR.
**Note:** *SMS token confirmation is Phase 1 and required* — the checkout screen promises it. Only *automated reminder* campaigns are deferred.

### Rules
- **No approval workflow.** Payment confirmed = booking confirmed. There is no staff approval step.
- **Do not silently add features.** Anything not on this list gets flagged and confirmed first.
- Flag every place that only *looks* functional and needs real backend wiring.
- Security: no exposed API keys in client code, validation on all forms, no admin routes in patient-facing navigation, Razorpay secret server-side only.

---

## 10. OPEN — NEEDS DR. SETHIA

These are clinic policy and content questions, not engineering ones. All are far cheaper to answer now than after launch.

1. **Confirm every credential in §2** — especially MP Medical Council #6421 and the ACC membership. Launch blocker.
2. **Average consultation time per visit type** — drives the whole slot grid, and decides whether first visits need a double slot.
3. **No-show policy** — refund, credit, or forfeit?
4. **GST invoices / numbered receipts** required for consultations? Retrofitting numbered receipts is painful.
5. **How far ahead can patients book?** The design shows 4 days with horizontal scroll and no calendar picker.
6. **Session token numbering** — `M-08`/`E-08` prefix, or continuous through the day?
