import { describe, expect, it } from "vitest";
import cases from "../../../shared/persian-cases.json";
import { normalize, toAsciiDigits, toFaDigits } from "./persian";

describe("normalize matches shared/persian-cases.json", () => {
  it.each(cases)("$in → $norm", ({ in: input, norm }) => {
    expect(normalize(input)).toBe(norm);
  });

  it("treats null and undefined as empty", () => {
    expect(normalize(null)).toBe("");
    expect(normalize(undefined)).toBe("");
  });
});

describe("digits", () => {
  it("round-trips ASCII ↔ Persian", () => {
    expect(toFaDigits("0123456789")).toBe("۰۱۲۳۴۵۶۷۸۹");
    expect(toAsciiDigits(toFaDigits("واحد 622"))).toBe("واحد 622");
    expect(toAsciiDigits("٠١٢٣٤٥٦٧٨٩")).toBe("0123456789");
  });
});
