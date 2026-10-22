"use client";

import type { OfferRow } from "../../lib/types";
import { project } from "../../lib/geo";
import { faNum } from "../../lib/fa";
import { DistrictSvg } from "./district.svg";

interface Props {
  rows: OfferRow[];
  anchor: { lat: number; lng: number; label: string };
  selectedId?: string;
  onSelect: (shopId: string) => void;
  radiusKm?: number;
}

// ponytail: the bbox is ≈3.6 km wide east–west; no zoom/pan, no map library.
const BBOX_KM = 3.6;
// 0.02° lat ≈ 2.22 km north–south, so the ring is an ellipse in the 0–100 square.
const BBOX_KM_NS = 2.22;

export function DistrictMap({ rows, anchor, selectedId, onSelect, radiusKm }: Props) {
  const pins = rows.flatMap((r) => {
    const p = r.store.lat != null && r.store.lng != null ? project(r.store.lat, r.store.lng) : null;
    return p ? [{ r, p }] : [];
  });
  const outside = rows.length - pins.length;
  const a = project(anchor.lat, anchor.lng);

  return (
    <div>
      <style>{`@keyframes tg-ping{0%{transform:scale(1);opacity:.5}100%{transform:scale(2.6);opacity:0}}
.tg-ping{transform-box:fill-box;transform-origin:center;animation:tg-ping 1.8s ease-out infinite}
@media (prefers-reduced-motion:reduce){.tg-ping{animation:none;opacity:.25}}`}</style>
      <div className="relative aspect-square w-full overflow-hidden rounded-[var(--radius-lg)] shadow-card">
        <DistrictSvg />
        {a && (
          <svg viewBox="0 0 100 100" className="pointer-events-none absolute inset-0 h-full w-full" aria-hidden="true">
            {radiusKm != null && (
              <ellipse cx={a.x} cy={a.y} rx={(radiusKm / BBOX_KM) * 100} ry={(radiusKm / BBOX_KM_NS) * 100} fill="none" strokeDasharray="2 2" strokeWidth="0.5" className="stroke-orange" />
            )}
            <circle cx={a.x} cy={a.y} r="3" className="tg-ping fill-orange" />
            <circle cx={a.x} cy={a.y} r="1.8" className="fill-orange stroke-surface" strokeWidth="0.6" />
          </svg>
        )}
        {pins.map(({ r, p }) => {
          const on = r.store.id === selectedId;
          const price = faNum(Math.round(r.offer.priceToman / 1000));
          return (
            <button
              key={r.store.id}
              type="button"
              aria-pressed={on}
              aria-label={`${r.store.name}، ${price} هزار تومان`}
              onClick={() => onSelect(r.store.id)}
              style={{ left: `${p.x}%`, top: `${p.y}%`, zIndex: on ? 2 : 1 }}
              className="absolute flex min-h-11 min-w-11 -translate-x-1/2 -translate-y-1/2 items-center justify-center"
            >
              <span
                className={`tabular rounded-[var(--radius-pill)] px-2 py-1 text-[13px] font-extrabold ${
                  on ? "bg-orange text-on-orange shadow-pin" : "bg-surface text-ink shadow-card"
                }`}
              >
                {price}
              </span>
            </button>
          );
        })}
      </div>
      <p className="mt-2 flex flex-wrap items-center gap-x-3 text-[13px] text-ink-muted">
        <span>فاصله‌ها از {anchor.label}</span>
        <span>{faNum(pins.length)} فروشگاه روی نقشه</span>
        {outside > 0 && <span>{faNum(outside)} فروشگاه خارج از نقشه</span>}
      </p>
    </div>
  );
}
