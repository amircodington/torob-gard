/* Persian display helpers — digits, prices, relative freshness */

const FA_DIGITS = "۰۱۲۳۴۵۶۷۸۹";

export function faNum(input: number | string): string {
  return String(input).replace(/\d/g, (d) => FA_DIGITS[Number(d)]);
}

export function faGroup(n: number): string {
  return faNum(n.toLocaleString("en-US").replace(/,/g, "٬"));
}

/** 23_500_000 → «۲۳٫۵ میلیون تومان» when tidy, else full grouped */
export function faPrice(toman: number): string {
  if (toman >= 1_000_000) {
    const m = toman / 1_000_000;
    const tidy = Math.round(m * 10) / 10;
    const asStr = tidy % 1 === 0 ? String(tidy) : tidy.toFixed(1);
    if (tidy < 100) return `${faNum(asStr.replace(".", "٫"))} میلیون تومان`;
  }
  return `${faGroup(toman)} تومان`;
}

/** full-precision price for detail rows */
export function faPriceFull(toman: number): string {
  return `${faGroup(toman)} تومان`;
}

export function faKm(km: number): string {
  const s = km % 1 === 0 ? String(km) : km.toFixed(1).replace(".", "٫");
  return `${faNum(s)} کیلومتر`;
}

export function faWalk(km: number): string {
  const min = Math.max(2, Math.round(km * 12));
  return min >= 60
    ? `حدود ${faNum(Math.round(min / 60))} ساعت پیاده`
    : `حدود ${faNum(min)} دقیقه پیاده`;
}

export const FRESH_STALE_MIN = 48 * 60; // مازاد بر ۴۸ ساعت = قدیمی

export function isStale(updatedMinAgo: number): boolean {
  return updatedMinAgo > FRESH_STALE_MIN;
}

export function faFreshness(updatedMinAgo: number): string {
  if (updatedMinAgo < 60) return `${faNum(updatedMinAgo)} دقیقه پیش`;
  if (updatedMinAgo < 60 * 24) {
    const h = Math.round(updatedMinAgo / 60);
    return `${faNum(h)} ساعت پیش`;
  }
  const d = Math.round(updatedMinAgo / (60 * 24));
  return `${faNum(d)} روز پیش`;
}

export function freshnessLabel(updatedMinAgo: number): string {
  return isStale(updatedMinAgo)
    ? `به‌روزرسانی ${faFreshness(updatedMinAgo)} (قدیمی)`
    : `به‌روزرسانی ${faFreshness(updatedMinAgo)}`;
}

/** Tehran-local "HH:MM" now, for opening-hours checks */
export function tehranNowMinutes(): number {
  try {
    const parts = new Intl.DateTimeFormat("en-GB", {
      timeZone: "Asia/Tehran",
      hour: "2-digit",
      minute: "2-digit",
      hour12: false,
    }).formatToParts(new Date());
    const h = Number(parts.find((p) => p.type === "hour")?.value ?? "12");
    const m = Number(parts.find((p) => p.type === "minute")?.value ?? "0");
    return h * 60 + m;
  } catch {
    const d = new Date();
    return d.getHours() * 60 + d.getMinutes();
  }
}

export function isOpenNow(
  hours: { opens: string; closes: string } | null
): boolean | null {
  if (!hours) return null;
  const toMin = (s: string) => {
    const [h, m] = s.split(":").map(Number);
    return h * 60 + m;
  };
  const now = tehranNowMinutes();
  return now >= toMin(hours.opens) && now <= toMin(hours.closes);
}
