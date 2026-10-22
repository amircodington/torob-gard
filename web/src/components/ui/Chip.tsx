"use client";

import { createContext, useContext } from "react";
import type { LucideIcon } from "lucide-react";
import { isDirectional } from "./chipIcon";

/** True inside a ChipGroup: its sliding pill is the selected shape, so the chip itself only changes text colour. */
export const InChipGroup = createContext(false);

/** A pill; a button when it has onClick, orange when selected. */
export function Chip({ label, selected, onClick, icon: Icon }: { label: string; selected?: boolean; onClick?: () => void; icon?: LucideIcon }) {
  const inGroup = useContext(InChipGroup);
  // Text on orange is 15px bold or larger (brand contrast rule); the resting pill stays 13px.
  const look = selected
    ? `${inGroup ? "bg-transparent" : "bg-orange"} text-[15px] text-on-orange`
    : "bg-surface text-[13px] text-ink shadow-card";
  const cls = `inline-flex items-center gap-1.5 rounded-pill px-3 text-start font-bold leading-5 transition-[background-color,color] duration-(--duration-fast) ease-out ${look}`;
  const icon = Icon && <Icon aria-hidden className={`size-4 shrink-0 ${isDirectional(Icon) ? "flip-rtl" : ""}`} />;
  if (!onClick)
    return (
      <span className={`${cls} py-1.5`}>
        {icon}
        {label}
      </span>
    );
  return (
    <button
      type="button"
      aria-pressed={selected}
      data-in-group={inGroup ? "" : undefined}
      onClick={onClick}
      // relative: paints above the group's absolutely positioned pill
      className={`${cls} relative min-h-11 py-1 focus-visible:outline-2 focus-visible:outline-focus active:scale-[0.97]`}
    >
      {icon}
      {label}
    </button>
  );
}
