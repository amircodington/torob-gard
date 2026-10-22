// @vitest-environment jsdom
import { afterEach, beforeAll, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { DistrictMap } from "./DistrictMap";
import type { OfferRow, Store } from "../../lib/types";

afterEach(cleanup);
let reduce = true;
beforeAll(() => {
  // jsdom has no matchMedia or ResizeObserver. The stub answers the two motion queries apart; the observer reports a laid-out map at once.
  window.matchMedia = (q: string) =>
    ({ matches: q.includes("no-preference") ? !reduce : q.includes("reduce") && reduce, media: q, addEventListener() {}, removeEventListener() {}, addListener() {}, removeListener() {} }) as unknown as MediaQueryList;
  globalThis.ResizeObserver = class {
    constructor(private cb: ResizeObserverCallback) {}
    observe() {
      this.cb([{ contentRect: { width: 300 } } as ResizeObserverEntry], this as unknown as ResizeObserver);
    }
    disconnect() {}
    unobserve() {}
  };
});

const row = (id: string, lat: number, lng: number, price = 23_500_000): OfferRow => ({
  offer: { offerId: `o${id}`, productId: "p", storeId: id, priceToman: price, updatedMinAgo: 5, stock: "confirmed" },
  store: { id, name: `فروشگاه ${id}`, lat, lng, distanceM: 300 } as Store,
});
const anchor = { lat: 35.6907, lng: 51.413, label: "مترو سعدی" };
const rows = [row("a", 35.6907, 51.413), row("b", 35.692, 51.431), row("c", 36.5, 52.5)];

describe("DistrictMap", () => {
  it("draws only in-bbox rows and counts the rest", () => {
    render(<DistrictMap rows={rows} anchor={anchor} onSelect={() => {}} />);
    expect(screen.getAllByRole("button")).toHaveLength(2);
    expect(screen.getByText("۱ فروشگاه خارج از نقشه")).toBeTruthy();
  });
  it("labels markers with Persian digits and the price unit", () => {
    render(<DistrictMap rows={rows} anchor={anchor} onSelect={() => {}} />);
    const label = screen.getAllByRole("button")[0].getAttribute("aria-label")!;
    expect(label).toContain("۲۳۵۰۰");
    expect(label).toContain("هزار تومان");
  });
  it("calls onSelect with the shop id", () => {
    const onSelect = vi.fn();
    render(<DistrictMap rows={rows} anchor={anchor} onSelect={onSelect} />);
    fireEvent.click(screen.getAllByRole("button")[1]);
    expect(onSelect).toHaveBeenCalledWith("b");
  });
  it("marks the selected marker pressed", () => {
    render(<DistrictMap rows={rows} anchor={anchor} selectedId="a" onSelect={() => {}} />);
    const [a, b] = screen.getAllByRole("button");
    expect(a.getAttribute("aria-pressed")).toBe("true");
    expect(b.getAttribute("aria-pressed")).toBe("false");
  });
  it("omits the out-of-map line when all rows fit", () => {
    render(<DistrictMap rows={rows.slice(0, 2)} anchor={anchor} onSelect={() => {}} />);
    expect(screen.queryByText(/خارج از نقشه/)).toBeNull();
  });
  it("fill drops the square box", () => {
    const { container, rerender } = render(<DistrictMap rows={rows} anchor={anchor} onSelect={() => {}} />);
    expect(container.querySelector(".aspect-square")).toBeTruthy();
    rerender(<DistrictMap rows={rows} anchor={anchor} onSelect={() => {}} fill />);
    expect(container.querySelector(".aspect-square")).toBeNull();
  });
  it("marks the hovered row's pin", () => {
    render(<DistrictMap rows={rows} anchor={anchor} hoveredId="b" onSelect={() => {}} />);
    const [a, b] = screen.getAllByRole("button");
    expect(a.hasAttribute("data-hovered")).toBe(false);
    expect(b.hasAttribute("data-hovered")).toBe(true);
  });
  it("drops the pins in once laid out, unless motion is reduced", () => {
    reduce = false;
    const { unmount } = render(<DistrictMap rows={rows} anchor={anchor} onSelect={() => {}} dropKey="k" />);
    expect((screen.getAllByRole("button")[0].firstElementChild as HTMLElement).style.opacity).toBe("0");
    unmount();
    reduce = true;
    render(<DistrictMap rows={rows} anchor={anchor} onSelect={() => {}} dropKey="k" />);
    expect((screen.getAllByRole("button")[0].firstElementChild as HTMLElement).style.opacity).toBe("");
  });
});
