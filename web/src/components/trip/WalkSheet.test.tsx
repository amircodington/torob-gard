// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { api } from "../../lib/api";
import type { Store, Trip } from "../../lib/types";
import { initialState } from "../../state/session";
import { WalkSheet } from "./WalkSheet";

vi.mock("next/navigation", () => ({
  useRouter: () => ({ replace: vi.fn(), push: vi.fn() }),
  usePathname: () => "/trip/t1/walk",
  useSearchParams: () => new URLSearchParams(""),
}));
vi.mock("../../state/session", async (orig) => ({
  ...(await orig<typeof import("../../state/session")>()),
  useSession: () => ({ state: initialState(), dispatch: vi.fn() }),
}));

afterEach(cleanup);
// jsdom has no matchMedia; gsap.matchMedia needs one (reduced motion → no entrance tween).
window.matchMedia = ((q: string) => ({ matches: q.includes("reduce"), media: q, addListener() {}, removeListener() {}, addEventListener() {}, removeEventListener() {} })) as unknown as typeof window.matchMedia;

const shop = (p: Partial<Store>): Store => ({
  id: "s1", name: "فروشگاه نمونه", mall: "پاساژ علاءالدین", floor: "3", unit: "622", venueSlug: "v", locationHint: null,
  parseConfidence: 1, address: "", locationLabel: "", lat: 35.69, lng: 51.41, distanceM: null, weeklyHours: {}, installment: null, contact: null,
  ...p,
});
const trip = (p: Partial<Store>): Trip => ({
  id: "t1", createdAt: "", productId: "p1", chosenShopId: "s1", req: {}, failures: [], anchor: {},
  product: { id: "p1", title: "گوشی نمونه", brand: null, imageUrl: null, minPrice: null, medianPrice: null, maxPrice: null, offerCount: 1 },
  shop: shop(p),
});

describe("WalkSheet", () => {
  it("unit known → the big «واحد ۶۲۲»", () => {
    render(<WalkSheet trip={trip({})} rows={[]} />);
    expect(screen.getByTestId("unit").textContent).toContain("واحد ۶۲۲");
  });

  it("unit null → «ثبت نشده», no digit in its place", () => {
    render(<WalkSheet trip={trip({ unit: null })} rows={[]} />);
    const unit = screen.getByTestId("unit").textContent ?? "";
    expect(unit).toContain("شماره‌ی واحد ثبت نشده");
    expect(unit).not.toMatch(/[0-9۰-۹]/);
  });

  it("unit null, no pasazh → «قبل از رفتن زنگ بزن»", () => {
    render(<WalkSheet trip={trip({ unit: null, mall: null })} rows={[]} />);
    expect(screen.getByTestId("unit").textContent).toBe("شماره‌ی واحد ثبت نشده — قبل از رفتن زنگ بزن");
  });

  it("unit null in a pasazh → «از اطلاعات پاساژ بپرس»", () => {
    render(<WalkSheet trip={trip({ unit: null })} rows={[]} />);
    expect(screen.getByTestId("unit").textContent).toBe("شماره‌ی واحد ثبت نشده — از اطلاعات پاساژ بپرس");
  });

  it("parseConfidence 0.6 → «احتمالاً»", () => {
    render(<WalkSheet trip={trip({ parseConfidence: 0.6 })} rows={[]} />);
    expect(screen.getByTestId("unit").textContent).toContain("احتمالاً");
  });

  it("floor null → one «طبقه ثبت نشده» pill", () => {
    render(<WalkSheet trip={trip({ floor: null })} rows={[]} />);
    expect(screen.getByText("طبقه ثبت نشده")).toBeTruthy();
  });

  it("found it → had it → the success status with the existing copy", () => {
    vi.spyOn(api, "report").mockResolvedValue({ id: "x" } as never);
    render(<WalkSheet trip={trip({})} rows={[]} />);
    fireEvent.click(screen.getByRole("button", { name: "پیداش کردم" }));
    fireEvent.click(screen.getByRole("button", { name: "آره" }));
    expect(screen.getByRole("status").textContent).toContain("خرید خوب!");
  });
});
