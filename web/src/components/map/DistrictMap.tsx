"use client";

import { useLayoutEffect, useRef } from "react";
import { gsap } from "gsap";
import { Info, MapPin } from "lucide-react";
import type { OfferRow } from "../../lib/types";
import { project } from "../../lib/geo";
import { faNum } from "../../lib/fa";
import { DistrictSvg } from "./district.svg";

interface Props {
  rows: OfferRow[];
  /** None: a trip saved from the phone's own position stores no coordinates. */
  anchor?: { lat: number; lng: number; label: string };
  selectedId?: string;
  onSelect: (shopId: string) => void;
  radiusKm?: number;
  hoveredId?: string | null;
  /** Fills its parent (lg split view): the square map covers the box and crops its edges. */
  fill?: boolean;
  /** Pins drop in once per value (product + anchor); filter changes do not replay it. */
  dropKey?: string;
  /** false: no caption under the map (the trip header already says where distances are from). */
  legend?: boolean;
}

// ponytail: the bbox is ≈3.6 km wide east–west; no zoom/pan, no map library.
const BBOX_KM = 3.6;
// 0.02° lat ≈ 2.22 km north–south, so the ring is an ellipse in the 0–100 square.
const BBOX_KM_NS = 2.22;

export function DistrictMap({ rows, anchor, selectedId, onSelect, radiusKm, hoveredId, fill, dropKey, legend = true }: Props) {
  const root = useRef<HTMLDivElement>(null);
  useLayoutEffect(() => {
    const el = root.current!;
    const mm = gsap.matchMedia(el);
    // Drop when the map is first laid out: on a phone it mounts hidden (list view) and drops when switched to.
    // ResizeObserver reports before paint, so pins never flash before they drop.
    const ro = typeof ResizeObserver === "undefined" ? null : new ResizeObserver(([e]) => {
      if (!e.contentRect.width) return;
      ro!.disconnect();
      // Radar moment: pins drop y -12→0 + fade, 320 ms back.out(1.4), 30 ms apart; the 9th pin on lands with the 8th.
      mm.add("(prefers-reduced-motion: no-preference)", () => {
        gsap.from("[data-pin] > span", { y: -12, opacity: 0, duration: 0.32, ease: "back.out(1.4)", stagger: (i) => Math.min(i, 7) * 0.03 });
      });
    });
    ro?.observe(el);
    return () => {
      ro?.disconnect();
      mm.revert();
    };
  }, [dropKey]); // replays only for a new product/anchor, not a filter change
  const pins = rows.flatMap((r) => {
    const p = r.store.lat != null && r.store.lng != null ? project(r.store.lat, r.store.lng) : null;
    return p ? [{ r, p }] : [];
  });
  const outside = rows.length - pins.length;
  const a = anchor ? project(anchor.lat, anchor.lng) : null;

  return (
    <div ref={root} data-map className={fill ? "flex h-full flex-col" : ""}>
      <style>{`@keyframes tg-ping{0%{transform:scale(1);opacity:.5}100%{transform:scale(2.6);opacity:0}}
.tg-ping{transform-box:fill-box;transform-origin:center;animation:tg-ping 1.8s ease-out infinite}
@media (prefers-reduced-motion:reduce){.tg-ping{animation:none;opacity:.25}}`}</style>
      <div data-map-box className={`relative w-full overflow-hidden rounded-[var(--radius-lg)] shadow-card ${fill ? "@container-[size] min-h-0 flex-1 bg-blush-soft" : "aspect-square"}`}>
        {/* fill: a square of the box's shorter side, centred (contain, letterboxed on blush): every pin stays visible. */}
        <div className={fill ? "absolute top-1/2 left-1/2 size-[100cqmin] -translate-x-1/2 -translate-y-1/2" : "absolute inset-0"}>
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
              data-pin
              data-hovered={r.store.id === hoveredId ? "" : undefined}
              aria-label={`${r.store.name}، ${price} هزار تومان`}
              onClick={() => onSelect(r.store.id)}
              style={{ left: `${p.x}%`, top: `${p.y}%`, zIndex: on ? 3 : r.store.id === hoveredId ? 2 : 1 }}
              className="group/pin absolute flex min-h-11 min-w-11 -translate-x-1/2 -translate-y-1/2 items-center justify-center"
            >
              <span
                className={`tabular rounded-[var(--radius-pill)] px-2 py-1 text-[13px] font-extrabold transition-[scale] duration-(--duration-fast) ease-out group-data-hovered/pin:scale-[1.12] motion-reduce:transition-none ${
                  on ? "bg-orange text-on-orange shadow-pin" : "bg-surface text-ink shadow-card"
                }`}
              >
                {price}
              </span>
            </button>
          );
        })}
        </div>
      </div>
      {legend && <p className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-[13px] text-ink-muted">
        {anchor && (
          <span className="inline-flex items-center gap-1">
            <MapPin aria-hidden className="size-4 shrink-0 text-orange" />
            فاصله‌ها از {anchor.label}
          </span>
        )}
        <span>{faNum(pins.length)} فروشگاه روی نقشه</span>
        {outside > 0 && (
          <span className="inline-flex items-center gap-1">
            <Info aria-hidden className="size-4 shrink-0" />
            {faNum(outside)} فروشگاه خارج از نقشه
          </span>
        )}
      </p>}
    </div>
  );
}
