import type { ReactNode } from "react";

/**
 * A white panel on the tinted page surface. The elevation is deliberately
 * light — DESIGN.md calls for "sterile architectural daylight" rather than
 * heavy drop shadows, which read as cluttered at this information density.
 */
export function Card({
  children,
  className = "",
  as: Tag = "div",
}: {
  children: ReactNode;
  className?: string;
  as?: "div" | "section" | "article";
}) {
  return (
    <Tag
      className={`rounded-card bg-surface-container-lowest p-5 shadow-[0_1px_3px_rgba(19,27,46,0.06)] ${className}`}
    >
      {children}
    </Tag>
  );
}

export function Pill({
  children,
  tone = "neutral",
}: {
  children: ReactNode;
  tone?: "neutral" | "primary" | "success" | "warning";
}) {
  const tones = {
    neutral: "bg-surface-container-high text-on-surface-variant",
    primary: "bg-primary-fixed text-on-primary-fixed",
    success: "bg-secondary-container text-on-secondary-container",
    warning: "bg-tertiary-fixed text-on-tertiary-fixed",
  } as const;

  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-label-md font-semibold ${tones[tone]}`}
    >
      {children}
    </span>
  );
}
