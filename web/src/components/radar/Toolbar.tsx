"use client";

import { activeFilterCount } from "../../lib/ranking";
import { faNum } from "../../lib/fa";
import type { SortKey } from "../../lib/types";
import { useSession } from "../../state/session";
import { Chip } from "../ui/Chip";

const SORTS: { key: SortKey; label: string }[] = [
  { key: "price", label: "قیمت" },
  { key: "distance", label: "فاصله" },
  { key: "freshness", label: "تازگی" },
];

export function Toolbar({ onFilters }: { onFilters: () => void }) {
  const { state, dispatch } = useSession();
  const count = activeFilterCount(state.filters);
  return (
    <div className="flex flex-wrap items-center gap-2">
      <div role="group" aria-label="حالت نمایش" className="flex rounded-pill bg-surface p-1 shadow-card md:hidden">
        {(["list", "map"] as const).map((v) => (
          <button
            key={v}
            type="button"
            aria-pressed={state.radarView === v}
            onClick={() => dispatch({ type: "SET_VIEW", view: v })}
            className={`min-h-11 rounded-pill px-4 text-[13px] font-bold focus-visible:outline-2 focus-visible:outline-focus ${
              state.radarView === v ? "bg-panel text-on-dark" : "text-ink-muted"
            }`}
          >
            {v === "list" ? "لیست" : "نقشه"}
          </button>
        ))}
      </div>
      <div role="group" aria-label="مرتب‌سازی" className="flex gap-2">
        {SORTS.map((s) => (
          <Chip key={s.key} label={s.label} selected={state.sort === s.key} onClick={() => dispatch({ type: "SET_SORT", sort: s.key })} />
        ))}
      </div>
      <button
        type="button"
        onClick={onFilters}
        className="ms-auto inline-flex min-h-11 items-center gap-2 rounded-pill bg-surface px-4 text-[13px] font-bold shadow-card focus-visible:outline-2 focus-visible:outline-focus active:scale-[0.97]"
      >
        فیلترها
        {count > 0 && (
          <span className="tabular grid h-5 min-w-5 place-items-center rounded-full bg-orange px-1 text-[12px] text-on-orange">{faNum(count)}</span>
        )}
      </button>
    </div>
  );
}
