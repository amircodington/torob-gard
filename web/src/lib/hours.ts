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

/** true/false from declared hours; null when nothing is declared for today. */
export function isOpenNow(weekly: WeeklyHours, now: Date): boolean | null {
  const { day, prev, t } = tehranNow(now);
  const today = weekly[day];
  const open = (d: string, after: boolean) =>
    weekly[d]?.status !== "closed" &&
    (weekly[d]?.shifts ?? []).some(({ start_time, end_time }) => {
      const [s, e] = [min(start_time), min(end_time)];
      if (after) return e <= s && t < e; // yesterday's shift spilling past midnight
      return e <= s ? t >= s : t >= s && t < e;
    });
  if (open(prev, true)) return true;
  if (!today) return null;
  return today.status === "closed" ? false : open(day, false);
}

const hm = (t: string) => faNum(t.endsWith(":00:00") ? String(Number(t.slice(0, 2))) : `${Number(t.slice(0, 2))}:${t.slice(3, 5)}`);

export function todayHoursLabel(weekly: WeeklyHours, now: Date): string {
  const today = weekly[tehranNow(now).day];
  if (!today) return "ساعت کاری ثبت نشده";
  if (today.status === "closed" || today.shifts.length === 0) return "امروز تعطیل";
  return `امروز ${today.shifts.map((s) => `${hm(s.start_time)} تا ${hm(s.end_time)}`).join(" و ")}`;
}
