import { expect, it } from "vitest";
import { applyFilters, planBRank, sortRows } from "./ranking";
import type { OfferRow, RadarFilters } from "./types";

const hours10to19 = { sun: { status: "declared", shifts: [{ start_time: "10:00:00", end_time: "19:00:00" }] } };
const row = (id: string, priceToman: number, distanceM: number | null, extra: Partial<OfferRow["offer"]> = {}): OfferRow => ({
  offer: { offerId: `o${id}`, productId: "p", storeId: id, priceToman, updatedMinAgo: 30, stock: "unknown", ...extra },
  store: {
    id, name: `shop ${id}`, mall: null, floor: null, unit: null, venueSlug: null, locationHint: null,
    parseConfidence: 1, address: "", locationLabel: "", lat: null, lng: null, distanceM,
    weeklyHours: hours10to19, installment: null, contact: null,
  },
});
const rows = [
  row("s1", 20_000_000, 300),
  row("s2", 21_000_000, 900, { stock: "confirmed" }),
  row("s3", 19_500_000, 2500),
  row("s4", 22_000_000, 600, { updatedMinAgo: 90 * 24 * 60 }),
];
const others = rows.filter((r) => r.store.id !== "s1");
const otherDist = others.map((r) => r.store.distanceM!);
const noFilters: RadarFilters = { maxPrice: null, maxDistanceKm: null, openNow: false, installment: false };

it("re-ranks plan B by the chosen priority", () => {
  expect(planBRank(rows, ["s1"], "price", null)[0].row.offer.priceToman).toBe(Math.min(...others.map((r) => r.offer.priceToman)));
  expect(planBRank(rows, ["s1"], "distance", null)[0].row.store.distanceM).toBe(Math.min(...otherDist));
  expect(planBRank(rows, rows.map((r) => r.store.id), "trust", null)).toEqual([]);
  expect(planBRank(rows, ["s1"], "trust", null)[0].row.store.id).toBe("s2");
});

it("notes budget and price difference honestly", () => {
  const band = { id: "m2", label: "۱۵ تا ۲۵ میلیون", min: 15_000_000, max: 21_000_000 };
  const top = planBRank(rows, ["s1"], "price", band);
  expect(top[0].reasons[0]).toContain("ارزان‌تر");
  expect(top.find((r) => r.row.store.id === "s4")!.tradeoffs).toContain("کمی بالاتر از بودجه‌ی ۱۵ تا ۲۵ میلیون");
});

it("excludes unknown hours when open-now is on", () => {
  const unknown = { ...rows[0], store: { ...rows[0].store, weeklyHours: {} } };
  expect(applyFilters([unknown], { ...noFilters, openNow: true })).toEqual([]);
  expect(applyFilters([unknown], noFilters)).toEqual([unknown]);
});

it("sorts null distance last", () => {
  const sorted = sortRows([row("x", 1, null), ...rows], "distance");
  expect(sorted.at(-1)!.store.id).toBe("x");
  expect(planBRank([row("x", 1, null), ...rows], ["s1"], "distance", null).at(-1)!.row.store.id).toBe("x");
});
