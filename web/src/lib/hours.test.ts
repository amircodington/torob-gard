import { expect, it } from "vitest";
import { isOpenNow, todayHoursLabel, weekHours } from "./hours";
import type { WeeklyHours } from "./types";

const sun12 = new Date("2026-10-25T08:30:00Z"); // Sunday 12:00 Tehran
const sun01 = new Date("2026-10-25T21:30:00Z"); // Monday 01:00 Tehran, inside Sunday's 18–02 shift
const closed = { status: "closed", shifts: [] };
const day = (...s: [string, string][]) => ({
  status: "declared",
  shifts: s.map(([start_time, end_time]) => ({ start_time, end_time })),
});

it("answers open-now from Tehran weekly hours", () => {
  expect(isOpenNow({}, sun12)).toBeNull();
  expect(isOpenNow({ sun: { status: "closed", shifts: [] } }, sun12)).toBe(false);
  expect(isOpenNow({ sun: { status: "declared", shifts: [{ start_time: "10:00:00", end_time: "19:00:00" }] } }, sun12)).toBe(true);
  expect(isOpenNow({ sun: { status: "declared", shifts: [{ start_time: "18:00:00", end_time: "02:00:00" }] } }, sun01)).toBe(true);
});

it("handles missing days and closed hours", () => {
  expect(isOpenNow({ mon: day(["10:00:00", "19:00:00"]) }, sun12)).toBeNull();
  expect(isOpenNow({ sun: day(["14:00:00", "19:00:00"]) }, sun12)).toBe(false);
  expect(isOpenNow({ sun: day(["10:00:00", "19:00:00"]), mon: closed }, sun01)).toBe(false);
});

it("labels today's hours", () => {
  expect(todayHoursLabel({ sun: day(["10:00:00", "19:00:00"]) }, sun12)).toBe("امروز ۱۰ تا ۱۹");
  expect(todayHoursLabel({}, sun12)).toBe("ساعت کاری ثبت نشده");
  expect(todayHoursLabel({ sun: closed } as WeeklyHours, sun12)).toBe("امروز تعطیل");
  expect(todayHoursLabel({ sun: day(["10:00:00", "14:00:00"], ["16:30:00", "21:00:00"]) }, sun12)).toBe(
    "امروز ۱۰ تا ۱۴ و ۱۶:۳۰ تا ۲۱",
  );
});

it("treats unfilled or unsupported hours as unknown", () => {
  const unsupported = { sun: { status: "unsupported", shifts: [{ start_time: "08:00:00", end_time: "08:00:00" }] } };
  const unfilled = { sun: { status: "declared", shifts: [{ start_time: "00:00:00", end_time: "00:00:00" }] } };
  expect(isOpenNow(unsupported, sun12)).toBeNull();
  expect(todayHoursLabel(unsupported, sun12)).toBe("ساعت کاری ثبت نشده");
  expect(isOpenNow(unfilled, sun12)).toBeNull();
  expect(todayHoursLabel(unfilled, sun12)).toBe("ساعت کاری ثبت نشده");
  expect(isOpenNow({ sun: day(["18:00:00", "02:00:00"]) }, sun01)).toBe(true);
});

it("lists the week with closed and undeclared days named", () => {
  const w = weekHours({ sat: day(["10:00:00", "19:30:00"]), fri: closed, sun: day(["10:00:00", "10:00:00"]) });
  expect(w).toHaveLength(7);
  expect(w[0]).toEqual({ day: "شنبه", hours: "۱۰ تا ۱۹:۳۰" });
  expect(w[1].hours).toBe("ثبت نشده");
  expect(w[6]).toEqual({ day: "جمعه", hours: "تعطیل" });
});
