/* Open-now and today's-hours label from Torob weekly_hours, in Tehran local time. */
import { faNum } from "./fa";
import type { WeeklyHours } from "./types";

const DAYS = ["sat", "sun", "mon", "tue", "wed", "thu", "fri"];
const FMT = new Intl.DateTimeFormat("en-GB", {
  timeZone: "Asia/Tehran", weekday: "short", hour: "2-digit", minute: "2-digit", hour12: false,
});
const min = (t: string) => Number(t.slice(0, 2)) * 60 + Number(t.slice(3, 5));

function tehranNow(now: Date): { day: string; prev: string; t: number } {
  const p = Object.fromEntries(FMT.formatToParts(now).map((x) => [x.type, x.value]));
  const i = DAYS.indexOf(p.weekday.toLowerCase());
  return { day: DAYS[i], prev: DAYS[(i + 6) % 7], t: (Number(p.hour) % 24) * 60 + Number(p.minute) };
}

// Honesty rule 3: only `declared` hours count; start == end is Torob's unfilled default, so unknown.
const shiftsOf = (weekly: WeeklyHours, d: string) =>
  weekly[d]?.status === "declared" ? weekly[d].shifts.filter((x) => x.start_time !== x.end_time) : [];

/** true/false from declared hours; null when nothing usable is declared for today. */
export function isOpenNow(weekly: WeeklyHours, now: Date): boolean | null {
  const { day, prev, t } = tehranNow(now);
  const spill = shiftsOf(weekly, prev).some((x) => min(x.end_time) < min(x.start_time) && t < min(x.end_time));
  if (spill) return true; // yesterday's shift running past midnight
  if (weekly[day]?.status === "closed") return false;
  const today = shiftsOf(weekly, day);
  if (today.length === 0) return null;
  return today.some(({ start_time, end_time }) => {
    const [s, e] = [min(start_time), min(end_time)];
    return e < s ? t >= s : t >= s && t < e;
  });
}

const hm = (t: string) => faNum(t.endsWith(":00:00") ? String(Number(t.slice(0, 2))) : `${Number(t.slice(0, 2))}:${t.slice(3, 5)}`);

export function todayHoursLabel(weekly: WeeklyHours, now: Date): string {
  const day = tehranNow(now).day;
  if (weekly[day]?.status === "closed") return "امروز تعطیل";
  const today = shiftsOf(weekly, day);
  if (today.length === 0) return "ساعت کاری ثبت نشده";
  return `امروز ${today.map((s) => `${hm(s.start_time)} تا ${hm(s.end_time)}`).join(" و ")}`;
}
