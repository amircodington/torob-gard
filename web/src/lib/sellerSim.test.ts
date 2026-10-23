import { expect, it } from "vitest";
import { simulateSeller } from "./sellerSim";

const now = new Date("2026-10-25T10:40:00Z"); // 14:10 Tehran

it("answers the same way for the same shop and product", () => {
  expect(simulateSeller("shop_1", "p1", 12_000_000, now)).toEqual(simulateSeller("shop_1", "p1", 12_000_000, now));
});

it("reaches every outcome across shops, with a Tehran reply time two minutes on", () => {
  const replies = Array.from({ length: 200 }, (_, i) => simulateSeller(`shop_${i}`, "p1", 12_000_000, now));
  expect(new Set(replies.map((r) => r.kind))).toEqual(new Set(["confirmed", "no_answer", "no_item"]));
  expect(replies.every((r) => r.at === "۱۴:۱۲")).toBe(true);
  const confirmed = replies.filter((r) => r.kind === "confirmed");
  expect(confirmed.some((r) => r.delta === 0)).toBe(true);
  // a changed price is higher, in whole 10,000s, never below 50,000
  for (const r of confirmed.filter((r) => r.delta))
    expect(r.delta % 10_000 === 0 && r.delta >= 50_000 && r.priceToman === 12_000_000 + r.delta).toBe(true);
});
