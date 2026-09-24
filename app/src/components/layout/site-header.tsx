import Image from "next/image";
import { CLINIC } from "@/lib/clinic";

/**
 * The emergency number is given real visual weight rather than tucked into a
 * corner. This is a cardiology practice: for some visitors, reaching a human
 * immediately matters more than anything else on the page.
 */
export function SiteHeader() {
  return (
    <header className="sticky top-0 z-40 border-b border-outline-variant/40 bg-surface-container-lowest/95 backdrop-blur">
      <div className="mx-auto flex w-full max-w-4xl items-center justify-between gap-3 px-4 py-3">
        <div className="flex min-w-0 items-center gap-3">
          <Image
            src="/brand/logo.jpg"
            alt=""
            width={40}
            height={40}
            className="h-10 w-10 shrink-0 rounded-lg object-contain"
          />
          <div className="flex min-w-0 flex-col leading-tight">
            <span className="truncate text-title-md font-bold text-primary">
              {CLINIC.name}
            </span>
            <span className="truncate text-label-md text-on-surface-variant">
              {CLINIC.locality}
            </span>
          </div>
        </div>

        <a
          href={`tel:${CLINIC.phone.replace(/[^0-9+]/g, "")}`}
          className="flex min-h-touch shrink-0 items-center gap-2 rounded-card bg-error-container px-4 text-label-lg font-bold text-on-error-container transition-[filter] hover:brightness-95"
        >
          <PhoneIcon />
          <span className="hidden sm:inline">Emergency</span>
          <span className="tabular sm:hidden">Call</span>
        </a>
      </div>
    </header>
  );
}

function PhoneIcon() {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 24 24"
      fill="currentColor"
      className="h-5 w-5"
    >
      <path d="M6.6 10.8a15.1 15.1 0 0 0 6.6 6.6l2.2-2.2c.3-.3.7-.4 1-.2 1.2.4 2.4.6 3.6.6.6 0 1 .4 1 1V20c0 .6-.4 1-1 1A17 17 0 0 1 3 4c0-.6.4-1 1-1h3.5c.6 0 1 .4 1 1 0 1.3.2 2.5.6 3.6.1.3 0 .7-.2 1l-2.3 2.2Z" />
    </svg>
  );
}
