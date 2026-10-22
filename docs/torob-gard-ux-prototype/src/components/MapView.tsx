import { MapPin } from "lucide-react";
import { cn } from "../utils/cn";
import { ANCHOR } from "../data/demo";
import { faKm, faNum, faPrice } from "../lib/fa";
import type { OfferRow } from "../lib/ranking";

/* ---------------------------------------------------------------
 * Schematic demo map — NOT real geography.
 * A stylized neighborhood sketch around the (fictional) user anchor
 * at میدان ونک. Distances shown in UI come from store.distanceKm;
 * marker positions are only visually consistent with it.
 * --------------------------------------------------------------- */

const KM_UNITS = 10; // تقریبی: هر واحد نقشه ≈ ۱۰۰ متر

export function MapView({
  rows,
  selectedId,
  failedIds,
  radiusKm,
  onSelect,
  className,
}: {
  rows: OfferRow[];
  selectedId: string | null;
  failedIds: string[];
  radiusKm: number | null;
  onSelect: (storeId: string) => void;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "relative overflow-hidden rounded-3xl border border-line bg-[#ece9e2] shadow-card",
        className
      )}
    >
      {/* base sketch */}
      <svg viewBox="0 0 100 74" className="block h-full w-full" preserveAspectRatio="xMidYMid slice" aria-hidden>
        <rect width="100" height="74" fill="#ece9e2" />
        {/* city blocks */}
        <g fill="#f5f3ee">
          <rect x="3" y="4" width="26" height="18" rx="3" />
          <rect x="34" y="4" width="22" height="14" rx="3" />
          <rect x="62" y="4" width="34" height="16" rx="3" />
          <rect x="3" y="27" width="22" height="16" rx="3" />
          <rect x="30" y="24" width="18" height="20" rx="3" />
          <rect x="64" y="26" width="14" height="14" rx="3" />
          <rect x="82" y="26" width="14" height="18" rx="3" />
          <rect x="4" y="48" width="24" height="22" rx="3" />
          <rect x="32" y="50" width="14" height="20" rx="3" />
          <rect x="64" y="60" width="30" height="12" rx="3" />
        </g>
        {/* park — پارک ساعی */}
        <rect x="62" y="32" width="34" height="22" rx="4" fill="#dde8d8" />
        <g fill="#c3d6bd">
          <circle cx="70" cy="38" r="1.6" />
          <circle cx="76" cy="44" r="1.4" />
          <circle cx="86" cy="37" r="1.8" />
          <circle cx="91" cy="46" r="1.4" />
          <circle cx="80" cy="49" r="1.5" />
        </g>
        <text x="97" y="34.5" fontSize="2.6" fill="#7d9a76" textAnchor="end" fontWeight="700">پارک ساعی</text>
        {/* roads */}
        <g stroke="#ffffff" strokeLinecap="round" fill="none">
          <path d="M0 23 H100" strokeWidth="3.2" />
          <path d="M0 46 H62 L100 58" strokeWidth="3.6" />
          <path d="M60 0 V74" strokeWidth="3.8" />
          <path d="M28 0 L32 74" strokeWidth="2.6" />
          <path d="M0 62 H64" strokeWidth="2.4" />
          <path d="M80 0 L78 60" strokeWidth="2.4" />
        </g>
        <g stroke="#d9d5cb" strokeDasharray="2 2" fill="none">
          <path d="M0 23 H100" strokeWidth="0.5" />
          <path d="M60 0 V74" strokeWidth="0.5" />
        </g>
        <text x="61.8" y="8" fontSize="2.6" fill="#9a9488" fontWeight="700">خیابان ولیعصر</text>
        <text x="8" y="21.4" fontSize="2.6" fill="#9a9488" fontWeight="700">بزرگراه چمران</text>
        <text x="33.5" y="72" fontSize="2.6" fill="#9a9488" fontWeight="700">ملاصدرا</text>
        {/* metro hint */}
        <g>
          <circle cx="46" cy="23" r="2.2" fill="#5b7fa6" />
          <text x="46" y="23.9" fontSize="2.6" fill="#fff" textAnchor="middle" fontWeight="900">M</text>
        </g>
        {/* distance radius */}
        {radiusKm != null && (
          <circle
            cx={ANCHOR.x}
            cy={(ANCHOR.y / 100) * 74}
            r={radiusKm * KM_UNITS}
            fill="rgb(217 45 43 / 0.055)"
            stroke="rgb(217 45 43 / 0.35)"
            strokeDasharray="1.6 1.6"
            strokeWidth="0.4"
          />
        )}
      </svg>

      {/* user anchor */}
      <div
        className="absolute z-10 -translate-x-1/2 -translate-y-1/2"
        style={{ left: `${ANCHOR.x}%`, top: `${ANCHOR.y}%` }}
      >
        <span className="absolute inset-0 m-auto h-8 w-8 -translate-x-[9px] -translate-y-[9px] rounded-full bg-brand/25 anim-ping" style={{ animation: "tg-ping 2.4s ease-out infinite" }} />
        <span className="relative block h-4 w-4 rounded-full border-[3px] border-white bg-brand shadow-md" />
        <span className="absolute right-1/2 top-full mt-1 translate-x-1/2 whitespace-nowrap rounded-full bg-ink px-2 py-0.5 text-[9px] font-bold text-white shadow">
          تو اینجایی — {ANCHOR.label} <span className="font-normal opacity-70">(فرضی)</span>
        </span>
      </div>

      {/* store markers (HTML overlay for crisp interaction) */}
      {rows.map(({ offer, store }, i) => {
        const failed = failedIds.includes(store.id);
        const selected = selectedId === store.id;
        return (
          <button
            key={store.id}
            type="button"
            onClick={() => onSelect(store.id)}
            aria-label={`${store.name} — ${faPrice(offer.priceToman)}`}
            style={{ left: `${store.mapX}%`, top: `${store.mapY}%` }}
            className={cn(
              "group absolute z-20 -translate-x-1/2 -translate-y-1/2 transition-transform",
              selected && "z-30 scale-125"
            )}
          >
            <span
              className={cn(
                "anim-pop grid place-items-center rounded-full border-2 shadow-md transition",
                selected
                  ? "h-9 w-9 border-white bg-brand text-white"
                  : failed
                    ? "h-7 w-7 border-white/90 bg-faint text-white"
                    : "h-7 w-7 border-white bg-white text-brand-deep hover:bg-brand hover:text-white"
              )}
            >
              {failed ? (
                <span className="text-[11px] font-black leading-none">×</span>
              ) : (
                <span className="tnum text-[11px] font-black leading-none">{faNum(i + 1)}</span>
              )}
            </span>
            <span
              className={cn(
                "pointer-events-none absolute right-1/2 top-full mt-1 translate-x-1/2 whitespace-nowrap rounded-lg px-1.5 py-0.5 text-[9px] font-bold shadow transition",
                selected ? "bg-ink text-white" : "bg-white/95 text-ink opacity-0 group-hover:opacity-100"
              )}
            >
              <MapPin className="mr-0.5 inline h-2.5 w-2.5" />
              {faPrice(offer.priceToman)} · {faKm(store.distanceKm)}
            </span>
          </button>
        );
      })}

      {/* honesty legend */}
      <div className="absolute bottom-2 right-2 z-20 rounded-full bg-white/90 px-2.5 py-1 text-[9px] font-semibold text-sub shadow backdrop-blur">
        نقشه‌ی شماتیک — موقعیت‌ها نمایشی‌اند، مسیریابی واقعی نیست
      </div>
    </div>
  );
}
