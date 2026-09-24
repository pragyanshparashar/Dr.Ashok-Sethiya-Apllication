/**
 * Clinic and practitioner details.
 *
 * IMPORTANT — every value here must be confirmed by Dr. Sethia before launch.
 * The Stitch design additionally displayed an MP Medical Council registration
 * number and an American College of Cardiology membership that the client
 * never supplied; those appear to be AI-generated filler and are deliberately
 * NOT reproduced here. Publishing an unverified registration number for a real
 * physician is a regulatory risk, not a content bug.
 *
 * Only details the client actually provided appear below.
 */
export const CLINIC = {
  name: "Dr. Ashok Sethia Clinic",
  locality: "M.G. Road, Indore",
  phone: "0731-2538958",
  addressLines: [
    "212 City Plaza, 564 M.G. Road",
    "Near Regal Cinema, Indore",
    "Madhya Pradesh – 452001",
  ],
} as const;

export const DOCTOR = {
  name: "Dr. Ashok Sethia",
  title: "Senior Consultant Physician & Cardiologist",
  qualifications: "MD, DNB, MNAMS",
} as const;

/** Life memberships, with the years the client confirmed. */
export const MEMBERSHIPS = [
  { body: "Cardiological Society of India", short: "CSI", since: 1991 },
  { body: "Association of Physicians of India", short: "API", since: 1993 },
  { body: "Indian Academy of Echocardiography", short: "IAE", since: 2001 },
] as const;

/**
 * Thesis and publications are listed separately and dated correctly.
 * The Stitch design merged them — presenting the 1985–87 Jhabua thesis as
 * though it were published in JAPI 1996, which is the citation belonging to
 * the Pneumomediastinum paper — and omitted both real publications entirely.
 */
export const THESIS = {
  title: "Cardiovascular Diseases in Tribals of Jhabua",
  period: "1985–87",
} as const;

export const PUBLICATIONS = [
  {
    title: "Pneumomediastinum – A Clinical Dilemma",
    journal: "JAPI",
    year: "1996",
  },
  {
    title:
      "Ebstein's Anomaly in Adults & Adolescents – Follow Up Series from Central India",
    journal: "JAPI",
    note: "Case series",
  },
] as const;
