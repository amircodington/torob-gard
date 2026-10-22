"use client";

import { createContext, useContext, type ComponentType } from "react";
import { isDirectional } from "./chipIcon";

/** True inside a ChipGroup: its sliding pill is the selected shape, so the chip itself only changes text colour. */
export const InChipGroup = createContext(false);

/** A pill; a button when it has onClick, orange when selected. */
export function Chip({ label, selected, onClick, icon: Icon }: { label: string; selected?: boolean; onClick?: () => void; icon?: ComponentType<{ className?: string; "aria-hidden"?: boolean }> }) {
  const inGroup = useContext(InChipGroup);
  // Text on orange is 15px bold or larger (brand contrast rule); the resting pill stays 13px.
  // In a group the track is the white shape and the pill the orange one; the selected chip keeps its own orange
  // until the group is ready (SSR / before hydration the pill is not placed yet). Text colour rides the pill's 220 ms.
  const look = inGroup
    ? selected
      ? "bg-orange group-data-ready/chips:bg-transparent text-[15px] text-on-orange"
      : "bg-transparent text-[13px] text-ink"
    : selected
      ? "bg-orange text-[15px] text-on-orange"
      : "bg-surface text-[13px] text-ink shadow-card";
  const timing = inGroup ? "duration-220 ease-out" : "duration-(--duration-fast) ease-out";
  const cls = `inline-flex items-center gap-1.5 rounded-pill px-3 text-start font-bold leading-5 transition-[background-color,color] ${timing} ${look}`;
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
