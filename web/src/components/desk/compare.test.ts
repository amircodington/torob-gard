import { describe, expect, it } from "vitest";
import { bestOf, deskEmpty, staleCompareIds } from "./compare";

describe("staleCompareIds", () => {
  it("returns the compared ids that are not on the desk", () => {
    expect(staleCompareIds(["a", "x", "b", "y"], [{ productId: "a" }, { productId: "b" }, { productId: "c" }])).toEqual(["x", "y"]);
  });
  it("is empty when every compared id is on the desk", () => {
    expect(staleCompareIds(["a"], [{ productId: "a" }])).toEqual([]);
  });
});

describe("deskEmpty", () => {
  it("a supported category with zero tiers is a budget problem, not a missing category", () => {
    expect(deskEmpty("laptop", [])).toBe("budget");
    expect(deskEmpty("other", undefined)).toBe("other");
    expect(deskEmpty("laptop", [{}])).toBeNull();
    expect(deskEmpty("laptop", undefined)).toBeNull();
  });
});

describe("bestOf", () => {
  const t = (productId: string, price: number, offerCount: number, newestPriceAt: string | null) => ({ productId, price, offerCount, newestPriceAt });
  it("names the lowest price, the most shops and the newest price", () => {
    expect(bestOf([t("a", 10, 2, "2026-10-01T00:00:00Z"), t("b", 20, 9, null), t("c", 30, 3, "2026-10-20T00:00:00Z")])).toEqual({
      price: ["a"],
      offers: ["b"],
      fresh: ["c"],
    });
  });
  it("ties return every tied id; no recorded time means no freshest", () => {
    expect(bestOf([t("a", 10, 5, null), t("b", 10, 5, null)])).toEqual({ price: ["a", "b"], offers: ["a", "b"], fresh: [] });
  });
});
