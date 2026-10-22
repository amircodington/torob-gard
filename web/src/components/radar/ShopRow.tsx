import { faGroup, faKm, faNum, faWalk } from "../../lib/fa";
import { Store as StoreIcon } from "lucide-react";
import { isOpenNow } from "../../lib/hours";
import type { OfferRow, Store } from "../../lib/types";
import { FreshBadge } from "../ui/FreshBadge";
import { StockBadge } from "../ui/StockBadge";

const floorName = (f: string) => (f === "0" ? "همکف" : faNum(f.replace(/^-/, "منفی ")));

/** «پاساژ · طبقه · واحد»; a missing part is named, never dropped; a guessed parse says «احتمالاً» (honesty rule 4). */
export function placeLine(s: Store): string {
  const maybe = s.parseConfidence < 0.8 ? "احتمالاً " : "";
  const floor = s.floor != null ? `طبقه ${floorName(s.floor)}` : null;
  const unit = s.unit != null ? `واحد ${faNum(s.unit)}` : null;
  const known = floor ?? unit; // the hedge goes once, on the first part we parsed
  const hedge = (part: string | null) => (part && part === known ? maybe + part : part);
  return [
    faNum(s.mall ?? (s.locationLabel || s.address)),
    hedge(floor) ?? "طبقه ثبت نشده",
    hedge(unit) ?? (s.mall ? "شماره‌ی واحد ثبت نشده — از اطلاعات پاساژ بپرس" : "شماره‌ی واحد ثبت نشده"),
  ].join(" · ");
}

export function distanceLabel(m: number | null): string {
  if (m == null) return "فاصله نامشخص";
  const km = m / 1000;
  return `${m < 1000 ? `${faNum(Math.round(m / 10) * 10)} متر` : faKm(Math.round(km * 10) / 10)} · ${faWalk(km)}`;
}

/** The brand ShopCard as a list row; the whole row is the tap target. */
export function ShopRow({ row, now, onOpen }: { row: OfferRow; now: Date; onOpen: () => void }) {
  const { offer, store } = row;
  const open = isOpenNow(store.weeklyHours, now);
  return (
    <button
      type="button"
      onClick={onOpen}
      className="flex min-h-11 w-full items-start gap-3 rounded-lg bg-surface p-4 text-start shadow-card focus-visible:outline-2 focus-visible:outline-focus active:scale-[0.99]"
    >
      <span className="grid h-11 w-11 shrink-0 place-items-center rounded-full bg-surface-tint text-ink">
        <StoreIcon className="h-5 w-5" />
      </span>
      <span className="min-w-0 flex-1">
        <span className="line-clamp-2 block break-words text-[15px] font-bold leading-6">{store.name}</span>
        <span className="mt-0.5 block break-words text-[13px] leading-5 text-ink-muted">{placeLine(store)}</span>
        <span className="mt-1.5 flex flex-wrap items-center gap-x-2 gap-y-1 text-[12px] leading-5 text-ink-muted">
          <span>{distanceLabel(store.distanceM)}</span>
          {open === true && (
            <span className="inline-flex items-center gap-1 font-semibold text-verified">
              <span aria-hidden className="h-2 w-2 rounded-full bg-verified" />
              الان باز
            </span>
          )}
          {open === false && <span className="font-semibold text-signal">بسته</span>}
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
