import type { ButtonHTMLAttributes, AnchorHTMLAttributes } from "react";

/**
 * Button variants for the clinic.
 *
 * Every variant is at least 48px tall. That is above the usual 44px guidance
 * because cardiac patients are commonly on beta blockers, and the resulting
 * tremor makes small targets genuinely difficult to hit accurately.
 */
type Variant = "primary" | "secondary" | "emergency" | "ghost";
type Size = "md" | "lg";

const base =
  "inline-flex items-center justify-center gap-2 rounded-card font-semibold " +
  "transition-colors disabled:opacity-50 disabled:cursor-not-allowed " +
  "disabled:pointer-events-none";

const variants: Record<Variant, string> = {
  primary: "bg-primary text-on-primary hover:bg-primary-container",
  secondary:
    "bg-surface-container-lowest text-on-surface ring-1 ring-outline-variant hover:bg-surface-container-low",
  emergency: "bg-error-container text-on-error-container hover:brightness-95",
  ghost: "text-primary hover:bg-surface-container-low",
};

const sizes: Record<Size, string> = {
  md: "min-h-touch px-5 text-label-lg",
  lg: "min-h-14 px-6 text-title-lg",
};

export function Button({
  variant = "primary",
  size = "md",
  className = "",
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: Variant;
  size?: Size;
}) {
  return (
    <button
      className={`${base} ${variants[variant]} ${sizes[size]} ${className}`}
      {...props}
    />
  );
}

export function ButtonLink({
  variant = "primary",
  size = "md",
  className = "",
  ...props
}: AnchorHTMLAttributes<HTMLAnchorElement> & {
  variant?: Variant;
  size?: Size;
}) {
  return (
    <a
      className={`${base} ${variants[variant]} ${sizes[size]} ${className}`}
      {...props}
    />
  );
}
