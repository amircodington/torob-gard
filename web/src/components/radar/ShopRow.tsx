import { faGroup, faKm, faNum, faWalk } from "../../lib/fa";
import { Clock, Footprints, MapPin, Store as StoreIcon } from "lucide-react";
import { isOpenNow } from "../../lib/hours";
import type { OfferRow, Store } from "../../lib/types";
import { FreshBadge } from "../ui/FreshBadge";
import { StockBadge } from "../ui/StockBadge";

const floorName = (f: string) => (f === "0" ? "همکف" : faNum(f.replace(/^-/, "منفی ")));

/** «طبقه · واحد»; a missing part is named, never dropped; a guessed parse says «احتمالاً» (honesty rule 4). */
export function floorUnit(s: Pick<Store, "mall" | "floor" | "unit" | "parseConfidence">): string {
  const maybe = s.parseConfidence < 0.8 ? "احتمالاً " : "";
  const floor = s.floor != null ? `طبقه ${floorName(s.floor)}` : null;
  const unit = s.unit != null ? `واحد ${faNum(s.unit)}` : null;
  const known = floor ?? unit; // the hedge goes once, on the first part we parsed
  const hedge = (part: string | null) => (part && part === known ? maybe + part : part);
  return [
    hedge(floor) ?? "طبقه ثبت نشده",
    hedge(unit) ?? (s.mall ? "شماره‌ی واحد ثبت نشده — از اطلاعات پاساژ بپرس" : "شماره‌ی واحد ثبت نشده"),
  ].join(" · ");
}

/** «پاساژ · طبقه · واحد». */
export function placeLine(s: Store): string {
  return `${faNum(s.mall ?? (s.locationLabel || s.address))} · ${floorUnit(s)}`;
}

export function distanceLabel(m: number | null): string {
  if (m == null) return "فاصله نامشخص";
  const km = m / 1000;
  return `${m < 1000 ? `${faNum(Math.round(m / 10) * 10)} متر` : faKm(Math.round(km * 10) / 10)} · ${faWalk(km)}`;
}

/** Latin runs («B-1024/7») stay whole and left-to-right inside the RTL line; one wider than the line still breaks. */
const isolateLatin = (t: string) => t.split(/(\S*[A-Za-z]\S*)/).map((part, i) => (i % 2 ? <bdi key={i} className="inline-block max-w-full [overflow-wrap:anywhere]">{part}</bdi> : part));

const hoverable = () => window.matchMedia("(hover: hover)").matches;

/** The brand ShopCard as a list row; the whole row is the tap target. */
export function ShopRow({ row, now, onOpen, active, onHover }: { row: OfferRow; now: Date; onOpen: () => void; active?: boolean; onHover?: (id: string | null) => void }) {
  const { offer, store } = row;
  const open = isOpenNow(store.weeklyHours, now);
  return (
    <button
      type="button"
      onClick={onOpen}
      onPointerEnter={onHover && (() => hoverable() && onHover(store.id))}
      onPointerLeave={onHover && (() => hoverable() && onHover(null))}
      className="flex min-h-11 w-full items-start gap-3 rounded-lg bg-surface p-4 text-start shadow-card transition-transform duration-(--duration-press) ease-out focus-visible:outline-2 focus-visible:outline-focus active:scale-[0.99]"
    >
      <span className={`grid h-11 w-11 shrink-0 place-items-center rounded-full transition-colors duration-(--duration-fast) ${active ? "bg-orange text-on-orange" : "bg-surface-tint text-ink"}`}>
        <StoreIcon aria-hidden className="h-5 w-5" />
      </span>
      <span className="min-w-0 flex-1">
        <span className="line-clamp-2 text-[15px] font-bold leading-6 break-words">{store.name}</span>
        <span className="mt-0.5 flex gap-1 text-[13px] leading-5 text-ink-muted">
          <MapPin aria-hidden className="mt-0.5 size-4 shrink-0" />
          <span className="min-w-0 break-words">{isolateLatin(placeLine(store))}</span>
        </span>
        <span className="mt-1.5 flex flex-wrap items-center gap-x-2 gap-y-1 text-[12px] leading-5 text-ink-muted">
          <span className="inline-flex items-center gap-1">
            <Footprints aria-hidden className="size-3.5 shrink-0" />
            {distanceLabel(store.distanceM)}
          </span>
          {open != null && (
            <span className={`inline-flex items-center gap-1 font-semibold ${open ? "text-verified" : "text-signal"}`}>
              <Clock aria-hidden className="size-3.5 shrink-0" />
              {open ? "الان باز" : "بسته"}
            </span>
          )}
          <StockBadge stock={offer.stock} />
        </span>
        <span className="mt-1 block">
          <FreshBadge updatedMinAgo={offer.updatedMinAgo} />
        </span>
      </span>
      <span className="tabular shrink-0 whitespace-nowrap text-[17px] font-extrabold leading-6">{faGroup(Math.round(offer.priceToman / 1000))}</span>
    </button>
  );
}
