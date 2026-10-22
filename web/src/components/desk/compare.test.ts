import { describe, expect, it } from "vitest";
import { staleCompareIds } from "./compare";

describe("staleCompareIds", () => {
  it("returns the compared ids that are not on the desk", () => {
    expect(staleCompareIds(["a", "x", "b", "y"], [{ productId: "a" }, { productId: "b" }, { productId: "c" }])).toEqual(["x", "y"]);
  });
  it("is empty when every compared id is on the desk", () => {
    expect(staleCompareIds(["a"], [{ productId: "a" }])).toEqual([]);
  });
});
