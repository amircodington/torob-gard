/* ---------------------------------------------------------------
 * Ranking & recovery logic — pure functions, UI-free.
 * Everything here works ONLY from demo.ts data (OFFERS/STORES),
 * so swapping in real API responses keeps this layer intact.
 * --------------------------------------------------------------- */

import { getOffer, getStore, offersFor, BUDGETS } from "../data/demo";
import { isOpenNow, isStale, faKm, faPrice } from "./fa";
import type {
  FailReason,
  Offer,
  RadarFilters,
  RecoveryPriority,
  Requirements,
  SortKey,
  Store,
} from "./types";

export interface OfferRow {
  offer: Offer;
  store: Store;
}

export function rowsForProduct(productId: string | null): OfferRow[] {
  return offersFor(productId)
    .map((offer) => ({ offer, store: getStore(offer.storeId)! }))
    .filter((r) => !!r.store);
}

/* ------------------------- filters + sorting ------------------------- */

export function applyFilters(rows: OfferRow[], f: RadarFilters): OfferRow[] {
  return rows.filter(({ offer, store }) => {
    if (f.maxPrice != null && offer.priceToman > f.maxPrice) return false;
    if (f.maxDistanceKm != null && store.distanceKm > f.maxDistanceKm) return false;
    if (f.openNow && isOpenNow(store.hours) !== true) return false;
    if (f.installment && store.installment !== true) return false;
    return true;
  });
}

export function sortRows(rows: OfferRow[], key: SortKey): OfferRow[] {
  const by = {
    price: (a: OfferRow, b: OfferRow) => a.offer.priceToman - b.offer.priceToman,
    distance: (a: OfferRow, b: OfferRow) => a.store.distanceKm - b.store.distanceKm,
    freshness: (a: OfferRow, b: OfferRow) => a.offer.updatedMinAgo - b.offer.updatedMinAgo,
  }[key];
  return [...rows].sort(by);
}

export const activeFilterCount = (f: RadarFilters) =>
  (f.maxPrice != null ? 1 : 0) +
  (f.maxDistanceKm != null ? 1 : 0) +
  (f.openNow ? 1 : 0) +
  (f.installment ? 1 : 0);

/* ------------------------------ Plan B ------------------------------ */

export const FAIL_COPY: Record<FailReason, { title: string; body: string }> = {
  "no-answer": {
    title: "فروشگاه جواب نداد",
    body: "تماس و پیام به این فروشگاه بی‌جواب موند؛ اعتماد به مسیر فعلی منطقی نیست. (سناریوی نمایشی)",
  },
  stock: {
    title: "موجودی تأیید نشد",
    body: "ثبت موجودی این پیشنهاد در ترب قدیمیه و فروشگاه هم تأیید نکرد؛ احتمال داره فروخته شده باشه. (سناریوی نمایشی)",
  },
  closed: {
    title: "فروشگاه بسته است",
    body: "ساعت کاری ثبت‌شده نشون می‌ده الان فروشگاه بسته باشه. (سناریوی نمایشی)",
  },
};

export const PRIORITY_META: Record<
  RecoveryPriority,
  { label: string; sub: string; why: string }
> = {
  price: {
    label: "قیمت مهم‌تره",
    sub: "ارزان‌ترین گزینه‌ی باقی‌مونده",
    why: "فروشگاه‌ها بر اساس «کمترین قیمت ثبت‌شده» برای همین مدل دوباره مرتب شدن؛ صرفه‌جویی ممکنه به بهای مسیر طولانی‌تر یا اطلاعات قدیمی‌تر تموم بشه.",
  },
  distance: {
    label: "نزدیکی مهم‌تره",
    sub: "کوتاه‌ترین مسیر تا فروشگاه",
    why: "فروشگاه‌ها بر اساس «فاصله از موقعیت فعلی‌ات» دوباره مرتب شدن؛ گاهی نزدیک‌ترین گزینه گرون‌تره یا موجودیش تأیید نشده.",
  },
  trust: {
    label: "اطمینان بیشتر مهمه",
    sub: "موجودی تأییدشده + اطلاعات تازه",
    why: "امتیاز اطمینان از «وضعیت موجودی تأییدشده» و «تازگی قیمت» ساخته شد؛ ممکنه لازم باشه کمی بیشتر مسیر بری یا مبلغ کمی بیشتر بدی.",
  },
};

export interface PlanBRow {
  row: OfferRow;
  rank: number;
  reasons: string[];   // چرا این رتبه؟
  tradeoffs: string[]; // صادقانه: چی عوض می‌شه
  kept: string[];      // کدوم نیازها دست‌نخورده می‌مونه
  score: number;
}

function confidenceScore(row: OfferRow): number {
  let s = 0;
  if (row.offer.stock === "confirmed") s += 60;
  else if (row.offer.stock === "unconfirmed") s += 20;
  if (!isStale(row.offer.updatedMinAgo)) s += 30;
  s += Math.max(0, 10 - row.offer.updatedMinAgo / 360); // تازگی
  return s;
}

/**
 * Re-rank alternative stores for the SAME product after a failure.
 * Pure function of demo data + chosen priority — results visibly
 * change per priority because each uses a different sort signal.
 */
export function planBRank(
  productId: string,
  failedStoreIds: string[],
  priority: RecoveryPriority,
  req: Requirements
): PlanBRow[] {
  const budget =
    req.category && req.budgetId
      ? BUDGETS[req.category].find((b) => b.id === req.budgetId) ?? null
      : null;

  const candidates = rowsForProduct(productId).filter(
    (r) => !failedStoreIds.includes(r.store.id)
  );
  const failedOffer = getOffer(productId, failedStoreIds[failedStoreIds.length - 1]);

  const keptBase: (r: OfferRow) => string[] = () => {
    const kept = ["مدل انتخابی تو دست‌نخورده می‌مونه"];
    return kept;
  };

  const rows: PlanBRow[] = candidates.map((row) => {
    const reasons: string[] = [];
    const tradeoffs: string[] = [];
    const kept = keptBase(row);

    if (budget?.max != null) {
      if (row.offer.priceToman <= budget.max) {
        kept.push(`در محدوده‌ی بودجه‌ات (${budget.label})`);
      } else {
        tradeoffs.push(`کمی بالاتر از بودجه‌ی ${budget.label}`);
      }
    }

    if (failedOffer) {
      const diff = failedOffer.priceToman - row.offer.priceToman;
      if (diff > 0) reasons.push(`${faPrice(diff)} ارزان‌تر از گزینه‌ی قبلی`);
      else if (diff < 0) tradeoffs.push(`${faPrice(-diff)} گرون‌تر از گزینه‌ی قبلی`);
    }

    if (row.offer.stock === "confirmed") reasons.push("موجودی در ترب تأیید شده");
    else if (row.offer.stock === "unconfirmed") reasons.push("موجودی ثبت‌شده ولی تازه تأیید نشده");
    else tradeoffs.push("وضعیت موجودی نامشخصه");

    if (!isStale(row.offer.updatedMinAgo)) reasons.push("قیمت، به‌روزرسانی تازه‌ای داره");
    else tradeoffs.push("قیمت ثبت‌شده قدیمیه؛ ممکنه تغییر کرده باشه");

    if (row.store.distanceKm <= 1.5) reasons.push("کاملا نزدیکته");
    else if (row.store.distanceKm >= 4) tradeoffs.push(`مسیر طولانی‌تر: ${faKm(row.store.distanceKm)}`);

    return { row, rank: 0, reasons, tradeoffs, kept, score: 0 };
  });

  const scoreOf = (r: PlanBRow): number => {
    if (priority === "price") return -r.row.offer.priceToman / 100_000;
    if (priority === "distance") return -r.row.store.distanceKm * 100;
    return confidenceScore(r.row);
  };

  rows.forEach((r) => (r.score = scoreOf(r)));
  rows.sort((a, b) => b.score - a.score);
  rows.forEach((r, i) => (r.rank = i + 1));
  return rows;
}

/** limiting-constraint diagnosis when nothing is left */
export function diagnoseNoAlternative(
  totalCandidates: number
): { title: string; body: string; suggestion: string } {
  if (totalCandidates > 0) {
    return {
      title: "گزینه‌ی جایگزینی نموند",
      body: "همه‌ی فروشگاه‌هایی که این مدل رو عرضه می‌کردن تو همین سفر امتحان شدن — رد شدن یا جواب ندادن. چیزی رو خودکار حذف نکردم؛ فقط فروشگاه‌های ردشده از چرخه خارج شدن.",
      suggestion:
        "می‌تونی به «میز تصمیم» برگردی و یکی از دو مدل دیگه رو انتخاب کنی؛ فروشگاه‌ها برای اون مدل‌ها هنوز دست‌نخورده‌ان.",
    };
  }
  return {
    title: "فروشگاهی با این مدل پیدا نشد",
    body: "در داده‌ی نمایشی، هیچ فروشگاهی این مدل را پیشنهاد نداده است.",
    suggestion: "یک مدل دیگر انتخاب کن یا دسته‌بندی را عوض کن.",
  };
}
