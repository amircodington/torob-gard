/* Ranking & recovery logic — pure functions, UI-free (ported from the prototype; data passed in). */
import { faKm, faPrice, isStale } from "./fa";
import { isOpenNow } from "./hours";
import type { BudgetBand, FailReason, OfferRow, RadarFilters, RecoveryPriority, SortKey } from "./types";

export type { OfferRow };

// Unknown distance sorts last and never passes a distance filter.
const km = (r: OfferRow) => (r.store.distanceM == null ? Infinity : r.store.distanceM / 1000);

/* ------------------------- filters + sorting ------------------------- */

export function applyFilters(rows: OfferRow[], f: RadarFilters, now = new Date()): OfferRow[] {
  return rows.filter((r) => {
    if (f.maxPrice != null && r.offer.priceToman > f.maxPrice) return false;
    if (f.maxDistanceKm != null && km(r) > f.maxDistanceKm) return false;
    if (f.openNow && isOpenNow(r.store.weeklyHours, now) !== true) return false;
    if (f.installment && r.store.installment !== true) return false;
    return true;
  });
}

export function sortRows(rows: OfferRow[], key: SortKey): OfferRow[] {
  const by = {
    price: (a: OfferRow, b: OfferRow) => a.offer.priceToman - b.offer.priceToman,
    distance: (a: OfferRow, b: OfferRow) => km(a) - km(b) || 0,
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
    body: "تماس و پیام به این فروشگاه بی‌جواب موند؛ اعتماد به مسیر فعلی منطقی نیست.",
  },
  stock: {
    title: "موجودی تأیید نشد",
    body: "گفتی که این فروشگاه جنس رو نداشت؛ ترب‌گرد موجودی رو از روی داده نمی‌دونه.",
  },
  closed: {
    title: "فروشگاه بسته است",
    body: "گفتی که بسته بود؛ ساعت کاری ثبت‌شده همیشه دقیق نیست.",
  },
};

export const PRIORITY_META: Record<RecoveryPriority, { label: string; sub: string; why: string }> = {
  price: {
    label: "قیمت مهم‌تره",
    sub: "ارزان‌ترین گزینه‌ی باقی‌مونده",
    why: "فروشگاه‌ها بر اساس «کمترین قیمت ثبت‌شده» برای همین مدل دوباره مرتب شدن؛ صرفه‌جویی ممکنه به بهای مسیر طولانی‌تر یا اطلاعات قدیمی‌تر تموم بشه.",
  },
  distance: {
    label: "نزدیکی مهم‌تره",
    sub: "کوتاه‌ترین مسیر تا فروشگاه",
    why: "فروشگاه‌ها بر اساس «فاصله از نقطه‌ای که انتخاب کردی» دوباره مرتب شدن؛ گاهی نزدیک‌ترین گزینه گرون‌تره یا موجودیش تأیید نشده.",
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
  reasons: string[]; // چرا این رتبه؟
  tradeoffs: string[]; // صادقانه: چی عوض می‌شه
  kept: string[]; // کدوم نیازها دست‌نخورده می‌مونه
  score: number;
}

function confidenceScore(row: OfferRow): number {
  let s = 0;
  if (row.offer.stock === "confirmed") s += 60;
  if (!isStale(row.offer.updatedMinAgo)) s += 30;
  s += Math.max(0, 10 - row.offer.updatedMinAgo / 360); // تازگی
  return s;
}

/** Re-rank alternative stores for the SAME product after a failure. */
export function planBRank(
  rows: OfferRow[],
  failedStoreIds: string[],
  priority: RecoveryPriority,
  budget: BudgetBand | null,
): PlanBRow[] {
  const candidates = rows.filter((r) => !failedStoreIds.includes(r.store.id));
  const lastFailed = failedStoreIds[failedStoreIds.length - 1];
  const failedOffer = rows.find((r) => r.store.id === lastFailed)?.offer;

  const out: PlanBRow[] = candidates.map((row) => {
    const reasons: string[] = [];
    const tradeoffs: string[] = [];
    const kept = ["مدل انتخابی تو دست‌نخورده می‌مونه"];

    if (budget?.max != null) {
      if (row.offer.priceToman <= budget.max) kept.push(`در محدوده‌ی بودجه‌ات (${budget.label})`);
      else tradeoffs.push(`کمی بالاتر از بودجه‌ی ${budget.label}`);
    }

    if (failedOffer) {
      const diff = failedOffer.priceToman - row.offer.priceToman;
      if (diff > 0) reasons.push(`${faPrice(diff)} ارزان‌تر از گزینه‌ی قبلی`);
      else if (diff < 0) tradeoffs.push(`${faPrice(-diff)} گرون‌تر از گزینه‌ی قبلی`);
    }

    if (row.offer.stock === "confirmed") reasons.push("یه خریدار تو ۴۸ ساعت گذشته تأیید کرده که داشت");
    else tradeoffs.push("وضعیت موجودی نامشخصه");

    if (!isStale(row.offer.updatedMinAgo)) reasons.push("قیمت، به‌روزرسانی تازه‌ای داره");
    else tradeoffs.push("قیمت ثبت‌شده قدیمیه؛ ممکنه تغییر کرده باشه");

    const d = km(row);
    if (d <= 1.5) reasons.push("کاملا نزدیکته");
    else if (d === Infinity) tradeoffs.push("فاصله‌ی این فروشگاه مشخص نیست");
    else if (d >= 4) tradeoffs.push(`مسیر طولانی‌تر: ${faKm(d)}`);

    return { row, rank: 0, reasons, tradeoffs, kept, score: 0 };
  });

  const scoreOf = (r: PlanBRow): number => {
    if (priority === "price") return -r.row.offer.priceToman / 100_000;
    if (priority === "distance") return -km(r.row) * 100;
    return confidenceScore(r.row);
  };

  out.forEach((r) => (r.score = scoreOf(r)));
  out.sort((a, b) => b.score - a.score || 0);
  out.forEach((r, i) => (r.rank = i + 1));
  return out;
}

/** limiting-constraint diagnosis when nothing is left */
export function diagnoseNoAlternative(totalCandidates: number): { title: string; body: string; suggestion: string } {
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
    body: "فعلاً هیچ فروشگاهی این مدل را در ترب پیشنهاد نداده است.",
    suggestion: "یک مدل دیگر انتخاب کن یا دسته‌بندی را عوض کن.",
  };
}
