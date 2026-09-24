import type { Metadata, Viewport } from "next";
import { Plus_Jakarta_Sans } from "next/font/google";
import "./globals.css";

/**
 * Plus Jakarta Sans, per the clinic's design system: a large x-height and open
 * apertures, which stop dosages, times and blood-pressure values from crowding
 * together at small sizes.
 */
const jakarta = Plus_Jakarta_Sans({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-jakarta",
  display: "swap",
});

export const metadata: Metadata = {
  title: "Dr. Ashok Sethia — Heart & Medical Clinic, Indore",
  description:
    "Book an OPD consultation with Dr. Ashok Sethia, Senior Consultant Physician & Cardiologist, Indore.",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  /* Deliberately NOT disabling user zoom. Pinch-to-zoom is an accessibility
     necessity for older patients, and blocking it is a common, harmful default
     in mobile web apps. */
  viewportFit: "cover",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className={`${jakarta.variable} h-full`}>
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
