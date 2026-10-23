"use client";

import { Banknote, Clock, Footprints, List, Map as MapIcon, SlidersHorizontal, type LucideIcon } from "lucide-react";
import { activeFilterCount } from "../../lib/ranking";
import { faNum } from "../../lib/fa";
import type { SortKey } from "../../lib/types";
import { useSession } from "../../state/session";
import { Chip } from "../ui/Chip";
import { ChipGroup } from "../ui/ChipGroup";

const SORTS: { key: SortKey; label: string; icon: LucideIcon }[] = [
  { key: "price", label: "قیمت", icon: Banknote },
  { key: "distance", label: "فاصله", icon: Footprints },
  { key: "freshness", label: "تازگی", icon: Clock },
];

/** Phone only: list or map (md+ shows both side by side). */
export function ViewSwitch() {
  const { state, dispatch } = useSession();
  return (
    <ChipGroup label="حالت نمایش">
      <Chip label="لیست" icon={List} selected={state.radarView === "list"} onClick={() => dispatch({ type: "SET_VIEW", view: "list" })} />
      <Chip label="نقشه" icon={MapIcon} selected={state.radarView === "map"} onClick={() => dispatch({ type: "SET_VIEW", view: "map" })} />
    </ChipGroup>
  );
}

/** One row at every width: sort chips and filters (icon-only on phones, so it fits 360 px). */
export function Toolbar({ onFilters }: { onFilters: () => void }) {
  const { state, dispatch } = useSession();
  const count = activeFilterCount(state.filters);
  return (
    <div className="flex items-center gap-2">
      <ChipGroup label="مرتب‌سازی">
        {SORTS.map((s) => (
          <Chip key={s.key} label={s.label} icon={s.icon} selected={state.sort === s.key} onClick={() => dispatch({ type: "SET_SORT", sort: s.key })} />
        ))}
      </ChipGroup>
      <button
        type="button"
        onClick={onFilters}
        className="relative ms-auto inline-flex min-h-11 min-w-11 shrink-0 items-center justify-center gap-2 rounded-pill bg-surface px-3 md:px-4 text-[13px] font-bold shadow-card lift press focus-visible:outline-2 focus-visible:outline-focus"
      >
        <SlidersHorizontal aria-hidden className="hover-hop size-4 shrink-0" />
        <span className="max-md:sr-only">فیلترها</span>
        {count > 0 && (
          // key: a new count remounts the badge, so it pops (0.9→1, 180 ms; reduced motion fades)
          <span key={count} className="pop-in tabular grid h-5 min-w-5 place-items-center rounded-full bg-orange px-1 text-[12px] text-on-orange max-md:absolute max-md:-end-1 max-md:-top-1">
            {faNum(count)}
          </span>
        )}
      </button>
    </div>
  );
}
