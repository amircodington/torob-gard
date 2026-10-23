import { describe, expect, it } from "vitest";
import { floorUnit } from "./ShopRow";

describe("floorUnit (honesty rule 4)", () => {
  it("a guessed parse hedges the floor, and a basement reads «منفی»", () => {
    expect(floorUnit({ mall: "x", floor: "-1", unit: "5", parseConfidence: 0.5 })).toBe("احتمالاً طبقه منفی ۱ · واحد ۵");
    expect(floorUnit({ mall: "x", floor: "-1", unit: "5", parseConfidence: 0.9 })).toBe("طبقه منفی ۱ · واحد ۵");
  });
  it("a missing part is named", () => {
    expect(floorUnit({ mall: null, floor: null, unit: "5", parseConfidence: 0.5 })).toBe("طبقه ثبت نشده · احتمالاً واحد ۵");
  });
});
