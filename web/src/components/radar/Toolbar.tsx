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

export function Toolbar({ onFilters }: { onFilters: () => void }) {
  const { state, dispatch } = useSession();
  const count = activeFilterCount(state.filters);
  return (
    <div className="flex flex-wrap items-center gap-2">
      <div className="md:hidden">
        <ChipGroup label="حالت نمایش">
          <Chip label="لیست" icon={List} selected={state.radarView === "list"} onClick={() => dispatch({ type: "SET_VIEW", view: "list" })} />
          <Chip label="نقشه" icon={MapIcon} selected={state.radarView === "map"} onClick={() => dispatch({ type: "SET_VIEW", view: "map" })} />
        </ChipGroup>
      </div>
      <ChipGroup label="مرتب‌سازی">
        {SORTS.map((s) => (
          <Chip key={s.key} label={s.label} icon={s.icon} selected={state.sort === s.key} onClick={() => dispatch({ type: "SET_SORT", sort: s.key })} />
        ))}
      </ChipGroup>
      <button
        type="button"
        onClick={onFilters}
        className="ms-auto inline-flex min-h-11 items-center gap-2 rounded-pill bg-surface px-4 text-[13px] font-bold shadow-card transition-transform duration-(--duration-press) ease-out focus-visible:outline-2 focus-visible:outline-focus active:scale-[0.97]"
      >
        <SlidersHorizontal aria-hidden className="size-4 shrink-0" />
        فیلترها
        {count > 0 && (
          // key: a new count remounts the badge, so it pops (0.9→1, 180 ms; reduced motion fades)
          <span key={count} className="pop-in tabular grid h-5 min-w-5 place-items-center rounded-full bg-orange px-1 text-[12px] text-on-orange">
            {faNum(count)}
          </span>
        )}
      </button>
    </div>
  );
}
