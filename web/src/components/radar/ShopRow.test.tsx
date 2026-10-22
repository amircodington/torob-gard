// @vitest-environment jsdom
import { afterEach, describe, expect, it } from "vitest";
import { cleanup, render, screen } from "@testing-library/react";
import type { OfferRow, Store } from "../../lib/types";
import { ShopRow } from "./ShopRow";

afterEach(cleanup);

const store = (p: Partial<Store> = {}): Store => ({
  id: "shop_1", name: "آویرا پاکوان", mall: "پاساژ علاءالدین", floor: "2", unit: "14", venueSlug: "v",
  locationHint: null, parseConfidence: 1, address: "خیابان جمهوری", locationLabel: "شیخ هادی",
  lat: 35.69, lng: 51.41, distanceM: 520, weeklyHours: {}, installment: null, contact: null, ...p,
});
const row = (s: Partial<Store> = {}, price = 35_500_000): OfferRow => ({
  offer: { offerId: "o1", productId: "p1", storeId: "shop_1", priceToman: price, updatedMinAgo: 30, stock: "unknown" },
  store: store(s),
});
const now = new Date("2026-10-22T10:00:00Z");
const show = (r: OfferRow) => render(<ShopRow row={r} now={now} onOpen={() => {}} />);

describe("ShopRow", () => {
  it("names the missing floor and unit instead of dropping them", () => {
    show(row({ floor: null, unit: null }));
    expect(screen.getByText(/طبقه ثبت نشده/)).toBeTruthy();
    expect(screen.getByText(/شماره‌ی واحد ثبت نشده/)).toBeTruthy();
  });

  it("isolates a Latin unit in one bdi, so «B-1024/7» never splits at the hyphen", () => {
    const { container } = show(row({ unit: "B-1024/7" }));
    expect([...container.querySelectorAll("bdi")].map((b) => b.textContent)).toEqual(["B-۱۰۲۴/۷"]);
    expect(container.textContent).toContain("پاساژ علاءالدین · طبقه ۲ · واحد B-۱۰۲۴/۷");
  });

  it("hedges a low-confidence place with «احتمالاً»", () => {
    show(row({ parseConfidence: 0.6 }));
    expect(screen.getByText(/احتمالاً/)).toBeTruthy();
  });

  it("states a confident place plainly", () => {
    show(row({ parseConfidence: 0.9 }));
    expect(screen.queryByText(/احتمالاً/)).toBeNull();
    expect(screen.getByText(/پاساژ علاءالدین · طبقه ۲ · واحد ۱۴/)).toBeTruthy();
  });

  it("a stale price says it may have changed, without a «(قدیمی)» marker", () => {
    const r = row();
    r.offer.updatedMinAgo = 115 * 24 * 60;
    show(r);
    expect(screen.getByText("به‌روزرسانی ۱۱۵ روز پیش · ممکن است تغییر کرده باشد")).toBeTruthy();
    expect(screen.queryByText(/قدیمی/)).toBeNull();
  });

  it("break-ui: a 60-char name and a 1.25-billion price wrap instead of overflowing", () => {
    const name = "فروشگاه بزرگ و مرکزی لوازم جانبی موبایل و تبلت شمیران‌نو".padEnd(60, "ـ");
    expect(name.length).toBe(60);
    show(row({ name }, 1_250_000_000));
    const title = screen.getByText(name);
    expect(title.className).toMatch(/break-words/);
    expect(title.className).toMatch(/line-clamp-2/);
    const price = screen.getByText("۱٬۲۵۰٬۰۰۰");
    expect(price.className).toMatch(/whitespace-nowrap/);
    expect(price.className).toMatch(/shrink-0/);
    // the text column can shrink below its content; the price column never pushes the row wider
    expect(title.parentElement!.className).toMatch(/min-w-0/);
  });
});
