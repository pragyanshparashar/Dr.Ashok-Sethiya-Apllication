---
name: Clinical Cardiology & Physician Care
colors:
  surface: '#faf8ff'
  surface-dim: '#d2d9f4'
  surface-bright: '#faf8ff'
  surface-container-lowest: '#ffffff'
  surface-container-low: '#f2f3ff'
  surface-container: '#eaedff'
  surface-container-high: '#e2e7ff'
  surface-container-highest: '#dae2fd'
  on-surface: '#131b2e'
  on-surface-variant: '#3f4850'
  inverse-surface: '#283044'
  inverse-on-surface: '#eef0ff'
  outline: '#707881'
  outline-variant: '#bfc7d2'
  surface-tint: '#006398'
  primary: '#006194'
  on-primary: '#ffffff'
  primary-container: '#007bb9'
  on-primary-container: '#fdfcff'
  inverse-primary: '#93ccff'
  secondary: '#006c49'
  on-secondary: '#ffffff'
  secondary-container: '#6cf8bb'
  on-secondary-container: '#00714d'
  tertiary: '#825100'
  on-tertiary: '#ffffff'
  tertiary-container: '#a36700'
  on-tertiary-container: '#fffbff'
  error: '#ba1a1a'
  on-error: '#ffffff'
  error-container: '#ffdad6'
  on-error-container: '#93000a'
  primary-fixed: '#cce5ff'
  primary-fixed-dim: '#93ccff'
  on-primary-fixed: '#001d31'
  on-primary-fixed-variant: '#004b73'
  secondary-fixed: '#6ffbbe'
  secondary-fixed-dim: '#4edea3'
  on-secondary-fixed: '#002113'
  on-secondary-fixed-variant: '#005236'
  tertiary-fixed: '#ffddb8'
  tertiary-fixed-dim: '#ffb95f'
  on-tertiary-fixed: '#2a1700'
  on-tertiary-fixed-variant: '#653e00'
  background: '#faf8ff'
  on-background: '#131b2e'
  surface-variant: '#dae2fd'
typography:
  display-lg:
    fontFamily: Plus Jakarta Sans
    fontSize: 40px
    fontWeight: '700'
    lineHeight: 52px
    letterSpacing: -0.02em
  headline-lg:
    fontFamily: Plus Jakarta Sans
    fontSize: 32px
    fontWeight: '700'
    lineHeight: 40px
    letterSpacing: -0.015em
  headline-lg-mobile:
    fontFamily: Plus Jakarta Sans
    fontSize: 26px
    fontWeight: '700'
    lineHeight: 34px
    letterSpacing: -0.01em
  headline-md:
    fontFamily: Plus Jakarta Sans
    fontSize: 24px
    fontWeight: '600'
    lineHeight: 32px
    letterSpacing: -0.01em
  headline-sm:
    fontFamily: Plus Jakarta Sans
    fontSize: 20px
    fontWeight: '600'
    lineHeight: 28px
  title-lg:
    fontFamily: Plus Jakarta Sans
    fontSize: 18px
    fontWeight: '600'
    lineHeight: 26px
  title-md:
    fontFamily: Plus Jakarta Sans
    fontSize: 16px
    fontWeight: '600'
    lineHeight: 24px
  body-lg:
    fontFamily: Plus Jakarta Sans
    fontSize: 18px
    fontWeight: '400'
    lineHeight: 28px
  body-md:
    fontFamily: Plus Jakarta Sans
    fontSize: 16px
    fontWeight: '400'
    lineHeight: 24px
  body-sm:
    fontFamily: Plus Jakarta Sans
    fontSize: 14px
    fontWeight: '400'
    lineHeight: 20px
  label-lg:
    fontFamily: Plus Jakarta Sans
    fontSize: 14px
    fontWeight: '600'
    lineHeight: 20px
    letterSpacing: 0.01em
  label-md:
    fontFamily: Plus Jakarta Sans
    fontSize: 12px
    fontWeight: '600'
    lineHeight: 16px
    letterSpacing: 0.02em
  label-sm:
    fontFamily: Plus Jakarta Sans
    fontSize: 11px
    fontWeight: '700'
    lineHeight: 14px
    letterSpacing: 0.04em
rounded:
  sm: 0.25rem
  DEFAULT: 0.5rem
  md: 0.75rem
  lg: 1rem
  xl: 1.5rem
  full: 9999px
spacing:
  gutter: 1.5rem
  gutter-mobile: 1rem
  margin: 2rem
  margin-mobile: 1rem
  space-xs: 0.25rem
  space-sm: 0.5rem
  space-md: 1rem
  space-lg: 1.5rem
  space-xl: 2.5rem
---

## Brand & Style

This design system delivers a clinical, high-trust digital environment tailored for the cardiology practice of Dr. Ashok Sethia. The aesthetic marries contemporary digital ergonomics with authoritative medical clarity. It eliminates ambient visual noise to prioritize calm, reassuring readability for both stressed patients and clinical operators.

The visual style blends **Modern Clinical Functionalism** with gentle tactile cues:
- **Calm Authority:** A soothing, clinical slate-blue anchor instills technical precision and deep diagnostic reliability.
- **Sterile Contrast:** Pure white planes layered over cool, tinted slate backdrops reflect surgical hygiene and structured order.
- **Senior-Friendly Accessibility:** Generous touch footprints, hyper-legible typographic spacing, and distinguished semantic cues accommodate elderly cardiac patients and their families under duress.
- **Empathetic Tactility:** Softly radiused cards and whisper-light ambient depth evoke approachable, human-centered specialist care rather than intimidating institutional bureaucracy.

## Colors

The system is locked to a high-legibility light theme to reflect a pristine, daylight-lit clinical setting.

### Role Tokens & Hex Mapping
- **Primary (`#0284c7` - Slate Blue):** Key CTAs, primary interactive highlights, cardiology focus badges, active booking workflows.
  - *Dark Accent (`#0369a1`):* Hover, active button states, and deep link interactions.
  - *Soft Wash (`#e0f2fe`):* Subtle highlights, active chip fills, and medical metric card accents.
- **Secondary (`#10b981` - Clinical Emerald):** Confirmed appointments, paid invoices, normal ECG/vitals markers, diagnostic validation.
  - *Deep Emerald (`#059669`):* Border accents and high-contrast text on success tokens.
  - *Emerald Wash (`#ecfdf5`):* Background container for confirmed appointment pills and positive health outcome summaries.
- **Tertiary (`#f59e0b` - Amber/Warm Ochre):** Pending verification, walk-in status, triage notices, follow-up reminders.
  - *Amber Wash (`#fef3c7`):* Warning backgrounds, waitlist counters, pending prescription pills.
- **Neutral Surface Hierarchy:**
  - *Canvas Base (`#ffffff`):* Primary card surfaces, modal dialogs, and diagnostic entry panes.
  - *Underlay Surface (`#f8fafc`):* Page background, passive layout shells, and dashboard grids.
  - *Elevated Sub-surface (`#f1f5f9`):* Inset metric blocks, clinical parameter groups, table row alternates.
  - *Structural Border (`#e2e8f0`):* Crisp, low-friction division across forms and patient cards.
- **Typography Neutrals:**
  - *Headings & Titles (`#0f172a`):* Maximum contrast for critical reading.
  - *Body & Secondary Labels (`#1e293b` / `#475569`):* Fatigue-reducing optical density for long clinical reports.

## Typography

Plus Jakarta Sans brings balanced geometry, large x-height, and open apertures that prevent visual crowding—essential when patients or clinic staff read dosages, time slots, and blood pressure values.

### Implementation Rules
- **Line Heights:** Body copy employs an expansive 1.5 to 1.55 ratio to reduce eye fatigue across multi-column medical histories.
- **Numbers & Metrics:** Vital stats (e.g., `120/80 mmHg`, `72 bpm`) must use tabular figures (`font-variant-numeric: tabular-nums`) with semi-bold weights for scan-readiness.
- **Hierarchy for Senior Legibility:** Mobile body text defaults to `body-md` (16px) or `body-lg` (18px). Sub-12px text is restricted to non-critical metadata and status uppercase labels.

## Layout & Spacing

The layout is built on an intentional 8-point baseline grid, prioritizing breathing room around diagnostic tools and doctor schedules.

### Breakpoints & Grid Structure
- **Desktop (>= 1024px):** 12-column fluid grid, max-width `1280px`, centered. 24px (`1.5rem`) gutters and 32px (`2rem`) outer margins.
- **Tablet (768px – 1023px):** 8-column layout. 16px (`1rem`) gutters and 24px (`1.5rem`) margins. Multi-slot consultation schedules collapse into two-up cards.
- **Mobile (< 768px):** 4-column layout. 16px margins. Interactive schedule chips flex into horizontally scrollable carousels with 8px item gaps.

### Spacing Usage
- `space-xs` (4px): Spacing between badge icons and label text; micro-gaps in input groups.
- `space-sm` (8px): Spacing inside scheduling slot pills; icon-to-text spacing in doctor credentials.
- `space-md` (16px): Internal padding for interactive items, list row separation, input field heights.
- `space-lg` (24px): Card interior padding, spacing between distinct clinical data sections.
- `space-xl` (40px): Section-to-section narrative breaks and booking flow boundaries.

## Elevation & Depth

Visual hierarchy uses clean, low-density diffuse shadows tinted with deep slate to mimic sterile architectural daylight. Heavy drop shadows are strictly avoided.

### Elevation Hierarchy
- **Level 0 (Flat Base):** `#f8fafc` page canvas, unbordered table backgrounds.
- **Level 1 (Clinical Cards & Containers):** `#ffffff` background with `1px solid #e2e8f0` and an ambient tint shadow:
  - `box-shadow: 0 1px 3px 0 rgba(15, 23, 42, 0.04), 0 1px 2px -1px rgba(15, 23, 42, 0.04)`
- **Level 2 (Active Slots & Hovered Profiles):** Used for selected appointment cards, floating doctor summary ribbons:
  - `box-shadow: 0 4px 6px -1px rgba(15, 23, 42, 0.06), 0 2px 4px -2px rgba(15, 23, 42, 0.04)`
  - Border transitions to `#0284c7` at 50% opacity.
- **Level 3 (Modals & Patient Drawers):** Critical diagnostic modals and confirmation sheets:
  - `box-shadow: 0 20px 25px -5px rgba(15, 23, 42, 0.08), 0 8px 10px -6px rgba(15, 23, 42, 0.03)`
  - Paired with an overlay backdrop: `rgba(15, 23, 42, 0.45)` with `backdrop-filter: blur(4px)`.

## Shapes

The design uses a balanced radius scale (Level 2: `0.5rem` base, up to `1rem` and `1.5rem` for major elements) to balance clinical rigor with patient warmth.

### Radius Application
- **Base (8px):** Form controls, inputs, dropdown menus, and data cells.
- **Large (`rounded-xl` / 16px):** Consultation detail cards, metric summary blocks, medical history modules.
- **Extra-Large (`rounded-2xl` / 24px):** Doctor spotlight cards, consultation summary panels, clinic location displays.
- **Full (`rounded-full`):** Status pills, triage badges, credential trust tags, and time-slot scheduling pills.

## Components

### 1. Buttons
- **Primary:** Background `#0284c7`, text `#ffffff`, radius 8px, font `label-lg`. Minimum height 48px to support motor accessibility. Hover: `#0369a1`. Focus: `2px ring #0284c7` with `2px` white offset.
- **Secondary / Outline:** Background `#ffffff`, border `1px solid #e2e8f0`, text `#1e293b`. Hover: `#f8fafc` with text `#0284c7`.
- **Destructive / Urgent:** Background `#fef2f2`, border `1px solid #fecaca`, text `#dc2626`.

### 2. Status & Trust Pills (Badges)
- **Confirmed / Paid:** Height 28px, padding `0 12px`, radius 9999px. Background `#ecfdf5`, border `1px solid #a7f3d0`, text `#059669` with a solid 6px emerald circle indicator.
- **Pending / Walk-In:** Height 28px, padding `0 12px`, radius 9999px. Background `#fef3c7`, border `1px solid #fde68a`, text `#b45309`.
- **Trust Pill (Credentials):** Height 32px, background `#e0f2fe`, text `#0369a1`, border `1px solid #bae6fd`, incorporating verified medical icons (e.g., Gold Medalist, Fellow of ACC).

### 3. Interactive Scheduling Time Pills
- Unselected: Height 44px, background `#ffffff`, border `1px solid #e2e8f0`, text `#1e293b`, radius 9999px.
- Hover: Border `#0284c7`, background `#f0f9ff`.
- Selected: Background `#0284c7`, border `1px solid #0284c7`, text `#ffffff`, accompanied by subtle scale transition (`transform: scale(1.02)`).
- Disabled / Booked: Background `#f1f5f9`, border `1px solid #e2e8f0`, text `#94a3b8`, cursor not-allowed.

### 4. Input Fields
- Height 48px, background `#ffffff`, border `1px solid #e2e8f0`, text `#0f172a`, radius 8px.
- Placeholder text in `#94a3b8`.
- Focus state: Border `#0284c7`, shadow ring `0 0 0 3px rgba(2, 132, 199, 0.15)`.
- Error state: Border `#ef4444`, ring `0 0 0 3px rgba(239, 68, 68, 0.15)`.

### 5. Cards & Doctor Profile Presentation
- **Doctor Overview Card:** Background `#ffffff`, border `1px solid #e2e8f0`, radius 24px, padding 32px. Features clear grid alignment for Dr. Ashok Sethia's profile: high-contrast headshot with soft border, designation pills (Senior Consultant Physician & Cardiologist, Indore), verified clinical affiliations, and quick action bar.
- **Metric Card (Vitals / Diagnostics):** Background `#f8fafc`, border `1px solid #e2e8f0`, radius 16px, padding 20px. Uses slate-blue tinted micro-icons for heart rate, blood pressure, and ECG reports.

### 6. Checkboxes & Radio Buttons
- 20px x 20px hit-area, radius 4px (checkbox) or 9999px (radio).
- Border `1.5px solid #cbd5e1`. Checked state: `#0284c7` background with a crisp white checkmark icon.

### 7. Clinical Lists & Patient Records
- Container: Background `#ffffff`, border `1px solid #e2e8f0`, radius 16px, divider lines `#f1f5f9`.
- Row items: Height 64px, flexible flexbox alignment with tabular numbers for appointment timestamps, patient age, and diagnostic identifiers.