import { expect, it } from "vitest";
import { faFreshness, faGroup, faPrice, faWalk, isStale, STALE_DAYS } from "./fa";

it("formats prices", () => {
  expect(faPrice(23_500_000)).toBe("۲۳٫۵ میلیون تومان");
  expect(faPrice(610_000)).toBe("۶۱۰٬۰۰۰ تومان");
  expect(faGroup(610000)).toBe("۶۱۰٬۰۰۰");
});

it("marks prices older than 60 days stale", () => {
  expect(STALE_DAYS).toBe(60);
  expect(isStale(59 * 24 * 60)).toBe(false);
  expect(isStale(61 * 24 * 60)).toBe(true);
});

it("formats walk time and freshness", () => {
  expect(faWalk(1)).toBe("حدود ۱۲ دقیقه پیاده");
  expect(faFreshness(3 * 24 * 60)).toBe("۳ روز پیش");
});
