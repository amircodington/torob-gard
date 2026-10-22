// @vitest-environment jsdom
import { afterEach, describe, expect, it } from "vitest";
import { cleanup, render, screen } from "@testing-library/react";
import { CountUp } from "./CountUp";

afterEach(cleanup);
// jsdom has no matchMedia or IntersectionObserver: motion is allowed, the tween never starts.
window.matchMedia = ((q: string) => ({ matches: q.includes("no-preference"), media: q, addListener() {}, removeListener() {}, addEventListener() {}, removeEventListener() {} })) as unknown as typeof window.matchMedia;

describe("CountUp", () => {
  it("renders the final number before any tween (honest without JS)", () => {
    render(<CountUp value={6476} />);
    expect(screen.getByText("۶٬۴۷۶")).toBeTruthy();
  });
  it("takes a format", () => {
    render(<CountUp value={531} format={(n) => `${n} پاساژ`} />);
    expect(screen.getByText("531 پاساژ")).toBeTruthy();
  });
});
