import type { ButtonHTMLAttributes } from "react";
import type { LucideIcon } from "lucide-react";
import { isDirectional } from "./chipIcon";

type Variant = "primary" | "ghost" | "panel";

const VARIANTS: Record<Variant, string> = {
  primary: "bg-orange text-on-orange shadow-card",
  ghost: "bg-surface-tint text-ink",
  panel: "bg-panel text-on-dark",
};

/** Btn's look, for a Link that should read as a button. */
export const btnClass = (variant: Variant = "primary") =>
  `inline-flex min-h-11 items-center justify-center gap-2 rounded-pill px-4 text-[15px] font-bold transition-transform duration-(--duration-press) ease-out focus-visible:outline-2 focus-visible:outline-focus active:scale-[0.97] disabled:opacity-50 ${VARIANTS[variant]}`;

export function Btn({
  variant = "primary",
  icon: Icon,
  iconEnd,
  className = "",
  type = "button",
  children,
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: Variant; icon?: LucideIcon; iconEnd?: boolean }) {
  const icon = Icon && <Icon aria-hidden className={`size-5 shrink-0 ${isDirectional(Icon) ? "flip-rtl" : ""}`} />;
  return (
    <button
      type={type}
      {...props}
      className={`${btnClass(variant)} ${className}`}
    >
      {!iconEnd && icon}
      {children}
      {iconEnd && icon}
    </button>
  );
}
