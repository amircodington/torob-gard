import type { ButtonHTMLAttributes } from "react";

type Variant = "primary" | "ghost" | "panel";

const VARIANTS: Record<Variant, string> = {
  primary: "bg-orange text-on-orange shadow-card",
  ghost: "bg-surface-tint text-ink",
  panel: "bg-panel text-on-dark",
};

export function Btn({ variant = "primary", className = "", type = "button", ...props }: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: Variant }) {
  return (
    <button
      type={type}
      {...props}
      className={`inline-flex min-h-11 items-center justify-center gap-2 rounded-pill px-4 text-[15px] font-bold transition-transform focus-visible:outline-2 focus-visible:outline-focus active:scale-[0.97] disabled:opacity-50 ${VARIANTS[variant]} ${className}`}
    />
  );
}
