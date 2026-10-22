import { describe, expect, it } from "vitest";
import { ArrowRight, Camera, Smartphone, Wallet } from "lucide-react";
import { chipIcon, isDirectional } from "./chipIcon";

describe("chipIcon", () => {
  it("maps chip ids to icons", () => {
    expect(chipIcon("cat:mobile")).toBe(Smartphone);
    expect(chipIcon("budget:custom")).toBe(Wallet);
    expect(chipIcon("prio:camera")).toBe(Camera);
    expect(chipIcon("go:products")).toBe(ArrowRight);
  });
  it("returns null for unknown ids", () => {
    expect(chipIcon("xyz")).toBeNull();
    expect(chipIcon("prio:unknown")).toBeNull();
  });
  it("marks direction icons for RTL mirroring", () => {
    expect(isDirectional(ArrowRight)).toBe(true);
    expect(isDirectional(Camera)).toBe(false);
  });
});
