// @vitest-environment jsdom
import { afterEach, beforeAll, describe, expect, it } from "vitest";
import { cleanup, render, screen } from "@testing-library/react";
import type { DeskTier } from "../../lib/types";
import { CompareSheet } from "./CompareSheet";

afterEach(cleanup);
beforeAll(() => {
  // jsdom has no matchMedia; the sheet asks for reduced motion (→ a plain fade).
  window.matchMedia = (q: string) => ({ matches: q.includes("reduce"), media: q, addEventListener() {}, removeEventListener() {}, addListener() {}, removeListener() {} }) as unknown as MediaQueryList;
});

const NOW = Date.parse("2026-10-22T00:00:00Z");
const tier = (productId: string, price: number, offerCount: number, newestPriceAt: string | null): DeskTier => ({
  tier: "budget", productId, title: productId, brand: null, imageUrl: null, specsTop3: [], price, offerCount, newestPriceAt,
  bullets: [], tradeoffs: [], fitNote: "", fitsPriority: false,
});
const row = (head: string) => screen.getByText(head).closest("tr")!;
const marked = (head: string) => row(head).querySelectorAll(".sr-only").length;

describe("CompareSheet best markers", () => {
  it("marks the cheapest and the most shops, and never a stale price as freshest", () => {
    render(<CompareSheet open onClose={() => {}} hasPriority={false} now={NOW} onPick={() => {}}
      tiers={[tier("a", 10, 2, "2026-06-01T00:00:00Z"), tier("b", 20, 5, null)]} />);
    expect(row("قیمت از").textContent).toMatch(/بهترین در این ردیف/);
    expect(marked("قیمت از")).toBe(1);
    expect(marked("فروشگاه‌ها")).toBe(1);
    // a is the only dated price, but it is 143 days old: it keeps its warning and gets no "best".
    expect(row("به‌روزرسانی").textContent).toMatch(/ممکن است تغییر کرده باشد/);
    expect(marked("به‌روزرسانی")).toBe(0);
  });
  it("marks nothing in a row where every column ties", () => {
    render(<CompareSheet open onClose={() => {}} hasPriority={false} now={NOW} onPick={() => {}}
      tiers={[tier("a", 10, 3, "2026-10-20T00:00:00Z"), tier("b", 10, 3, "2026-10-20T00:00:00Z")]} />);
    for (const head of ["قیمت از", "فروشگاه‌ها", "به‌روزرسانی"]) expect(marked(head)).toBe(0);
  });
});
