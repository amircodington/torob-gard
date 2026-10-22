import { describe, expect, it } from "vitest";
import { deskEmpty, staleCompareIds } from "./compare";

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
