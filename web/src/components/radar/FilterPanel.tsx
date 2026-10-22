"use client";

import type { ReactNode } from "react";
import { faNum, faPrice } from "../../lib/fa";
import { useSession } from "../../state/session";
import { Btn } from "../ui/Btn";
import { Chip } from "../ui/Chip";
import { Sheet } from "../ui/Sheet";

export const NO_FILTERS = { maxPrice: null, maxDistanceKm: null, openNow: false, installment: false };

const DISTANCES: { km: number | null; label: string }[] = [
  { km: 0.5, label: "۵۰۰ متر" },
  { km: 1, label: "۱ کیلومتر" },
  { km: 2, label: "۲ کیلومتر" },
  { km: null, label: "همه" },
];

function Group({ title, children }: { title: string; children: ReactNode }) {
  return (
    <fieldset className="mt-5">
      <legend className="mb-2 text-[13px] font-bold text-on-dark/70">{title}</legend>
      <div className="flex flex-wrap gap-2">{children}</div>
    </fieldset>
  );
}

/** Price ceilings come from this product's own spread (cheapest, median, 85th percentile). */
function priceSteps(prices: number[]): number[] {
  const p = [...prices].sort((a, b) => a - b);
  if (!p.length) return [];
  const at = (q: number) => p[Math.min(p.length - 1, Math.floor(p.length * q))];
  return [...new Set([at(0), at(0.5), at(0.85)])];
}

export function FilterPanel({ open, onClose, prices, shown }: { open: boolean; onClose: () => void; prices: number[]; shown: number }) {
  const { state, dispatch } = useSession();
  const f = state.filters;
  const set = (patch: Partial<typeof f>) => dispatch({ type: "SET_FILTERS", patch });
  return (
    <Sheet open={open} onClose={onClose} labelledby="filters-title">
      <h2 id="filters-title" className="pe-12 text-[20px] leading-8">
        <span className="font-light">فیلتر </span>
        <span className="font-extrabold">فروشگاه‌ها</span>
      </h2>
      <Group title="سقف قیمت">
        <Chip label="مهم نیست" selected={f.maxPrice == null} onClick={() => set({ maxPrice: null })} />
        {priceSteps(prices).map((v) => (
          <Chip key={v} label={`تا ${faPrice(v)}`} selected={f.maxPrice === v} onClick={() => set({ maxPrice: v })} />
        ))}
      </Group>
      <Group title="فاصله">
        {DISTANCES.map((d) => (
          <Chip key={d.label} label={d.label} selected={f.maxDistanceKm === d.km} onClick={() => dispatch({ type: "APPLY_PRESET_DISTANCE", km: d.km })} />
        ))}
      </Group>
      <Group title="فقط">
        <Chip label="الان باز" selected={f.openNow} onClick={() => set({ openNow: !f.openNow })} />
        <Chip label="اقساط" selected={f.installment} onClick={() => set({ installment: !f.installment })} />
      </Group>
      <p className="mt-3 text-[12px] leading-5 text-on-dark/60">«الان باز» فقط فروشگاه‌هایی رو نشون می‌ده که ساعت کاری ثبت کردن.</p>
      <div className="mt-6 flex gap-2">
        <Btn className="flex-1" onClick={onClose}>
          دیدن {faNum(shown)} فروشگاه
        </Btn>
        <Btn variant="ghost" onClick={() => set(NO_FILTERS)}>
          پاک کردن فیلترها
        </Btn>
      </div>
    </Sheet>
  );
}
