import {
  BadgeCheck,
  CircleDashed,
  Clock3,
  FlaskConical,
  Minus,
  type LucideIcon,
  X,
} from "lucide-react";
import { type ReactNode, useEffect } from "react";
import { createPortal } from "react-dom";
import { cn } from "../utils/cn";
import { DEMO_LABEL } from "../data/demo";
import type { StockStatus } from "../lib/types";
import { TorobGardMascot } from "./Mascot";

/* ---------- demo label ---------- */
export function DemoTag({ className }: { className?: string }) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-full border border-dashed border-brand/40 bg-brand-tint px-2 py-0.5 text-[10px] font-semibold text-brand-deep",
        className
      )}
    >
      <FlaskConical className="h-3 w-3" />
      {DEMO_LABEL}
    </span>
  );
}

/* ---------- buttons ---------- */
type BtnProps = {
  children: ReactNode;
  onClick?: () => void;
  variant?: "primary" | "secondary" | "ghost" | "danger" | "outline";
  size?: "sm" | "md" | "lg";
  className?: string;
  disabled?: boolean;
  icon?: LucideIcon;
};

export function Btn({
  children,
  onClick,
  variant = "primary",
  size = "md",
  className,
  disabled,
  icon: Icon,
}: BtnProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={cn(
        "focusable inline-flex items-center justify-center gap-2 rounded-2xl font-bold transition active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-50",
        size === "sm" && "h-9 px-3 text-xs",
        size === "md" && "h-11 px-4 text-sm",
        size === "lg" && "h-12 px-5 text-[15px]",
        variant === "primary" && "bg-brand text-white shadow-[0_6px_20px_-8px_rgb(217_45_43/0.7)] hover:bg-brand-deep",
        variant === "secondary" && "bg-ink text-white hover:bg-black",
        variant === "ghost" && "bg-transparent text-ink hover:bg-black/5",
        variant === "outline" && "border border-line bg-white text-ink hover:border-brand/50 hover:text-brand-deep",
        variant === "danger" && "border border-brand/30 bg-brand-tint text-brand-deep hover:bg-brand-tint2",
        className
      )}
    >
      {Icon && <Icon className={cn(size === "sm" ? "h-3.5 w-3.5" : "h-4 w-4")} />}
      {children}
    </button>
  );
}

/* ---------- chip (selectable pill) ---------- */
export function Chip({
  label,
  hint,
  active,
  disabled,
  onClick,
  className,
}: {
  label: string;
  hint?: string;
  active?: boolean;
  disabled?: boolean;
  onClick?: () => void;
  className?: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={cn(
        "focusable flex flex-col items-start gap-0.5 rounded-2xl border px-3.5 py-2 text-right text-[13px] font-semibold transition active:scale-[0.97] disabled:cursor-default",
        active
          ? "border-brand bg-brand text-white shadow-[0_4px_14px_-6px_rgb(217_45_43/0.6)]"
          : "border-line bg-white text-ink hover:border-brand/50 hover:bg-brand-tint/50",
        disabled && "opacity-45 hover:border-line hover:bg-white",
        className
      )}
    >
      <span>{label}</span>
      {hint && <span className={cn("text-[10px] font-normal", active ? "text-white/85" : "text-sub")}>{hint}</span>}
    </button>
  );
}

/* ---------- badges ---------- */
export function StockBadge({ stock, compact }: { stock: StockStatus; compact?: boolean }) {
  const map = {
    confirmed: { label: "موجودی تأییدشده", cls: "bg-mint-tint text-mint", Icon: BadgeCheck },
    unconfirmed: { label: "موجودی تأییدنشده", cls: "bg-amber-tint text-ambery", Icon: Clock3 },
    unknown: { label: "موجودی نامشخص", cls: "bg-black/5 text-sub", Icon: CircleDashed },
  } as const;
  const { label, cls, Icon } = map[stock];
  return (
    <span className={cn("inline-flex items-center gap-1 rounded-full px-2 py-1 text-[10px] font-bold", cls)}>
      <Icon className="h-3 w-3" />
      {compact ? label.replace("موجودی ", "") : label}
    </span>
  );
}

export function FreshBadge({ stale, text }: { stale: boolean; text: string }) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-full px-2 py-1 text-[10px] font-bold",
        stale ? "bg-amber-tint text-ambery" : "bg-cloud text-sky-ink"
      )}
    >
      <Clock3 className="h-3 w-3" />
      {text}
    </span>
  );
}

/* ---------- section heading ---------- */
export function SectionHead({
  icon: Icon,
  title,
  sub,
  extra,
}: {
  icon?: LucideIcon;
  title: string;
  sub?: string;
  extra?: ReactNode;
}) {
  return (
    <div className="flex items-start justify-between gap-3">
      <div className="flex items-start gap-3">
        {Icon && (
          <span className="mt-0.5 grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-brand-tint text-brand-deep">
            <Icon className="h-4.5 w-4.5" />
          </span>
        )}
        <div>
          <h2 className="text-lg font-extrabold leading-snug">{title}</h2>
          {sub && <p className="mt-0.5 text-xs leading-relaxed text-sub">{sub}</p>}
        </div>
      </div>
      {extra}
    </div>
  );
}

/* ---------- bottom sheet ---------- */
export function Sheet({
  open,
  onClose,
  children,
  labelledby,
}: {
  open: boolean;
  onClose: () => void;
  children: ReactNode;
  labelledby?: string;
}) {
  useEffect(() => {
    if (!open) return;
    const fn = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", fn);
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", fn);
      document.body.style.overflow = "";
    };
  }, [open, onClose]);

  if (!open) return null;
  return createPortal(
    <div className="fixed inset-0 z-50" role="dialog" aria-modal="true" aria-labelledby={labelledby}>
      <button
        aria-label="بستن"
        onClick={onClose}
        className="anim-scrim absolute inset-0 h-full w-full cursor-default bg-ink/45 backdrop-blur-[2px]"
      />
      <div className="anim-sheet absolute inset-x-0 bottom-0 mx-auto max-h-[92dvh] w-full max-w-2xl overflow-y-auto nice-scroll rounded-t-[28px] bg-cream p-4 pb-[max(1.25rem,env(safe-area-inset-bottom))] shadow-pop sm:p-6">
        <div className="mx-auto mb-3 h-1.5 w-12 rounded-full bg-line" />
        <button
          onClick={onClose}
          aria-label="بستن پنل"
          className="focusable absolute left-4 top-4 grid h-9 w-9 place-items-center rounded-full bg-white text-sub shadow-card transition hover:text-ink"
        >
          <X className="h-4.5 w-4.5" />
        </button>
        {children}
      </div>
    </div>,
    document.body
  );
}

/* ---------- empty / error state ---------- */
export function EmptyState({
  title,
  body,
  actions,
  compact,
}: {
  title: string;
  body: string;
  actions?: ReactNode;
  compact?: boolean;
}) {
  return (
    <div
      className={cn(
        "anim-rise flex flex-col items-center rounded-3xl border border-dashed border-line bg-white/60 text-center",
        compact ? "gap-2 p-5" : "gap-3 p-8"
      )}
    >
      <TorobGardMascot pose="stuck" framed={false} className={cn(compact ? "h-24 w-24" : "h-32 w-32", "opacity-95")} />
      <h3 className={cn("font-extrabold", compact ? "text-sm" : "text-base")}>{title}</h3>
      <p className="max-w-sm text-xs leading-relaxed text-sub">{body}</p>
      {actions && <div className="mt-1 flex flex-wrap items-center justify-center gap-2">{actions}</div>}
    </div>
  );
}

/* ---------- tiny key-value row ---------- */
export function KV({ k, v, icon: Icon, warn }: { k: string; v: ReactNode; icon?: LucideIcon; warn?: boolean }) {
  return (
    <div className="flex items-start justify-between gap-3 py-2">
      <span className="flex items-center gap-1.5 text-xs text-sub">
        {Icon && <Icon className="h-3.5 w-3.5" />}
        {k}
      </span>
      <span className={cn("text-left text-xs font-semibold leading-relaxed", warn && "text-ambery")}>{v}</span>
    </div>
  );
}

export { Minus as MinusIcon };
