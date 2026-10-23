// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { api } from "../../lib/api";
import type { OfferRow } from "../../lib/types";
import { initialState, type SessionState } from "../../state/session";
import { Flip } from "gsap/Flip";
import { PlanB } from "./PlanB";

vi.mock("gsap/Flip", () => ({ Flip: { getState: vi.fn(() => ({})), from: vi.fn() } }));
vi.mock("../../lib/motion", async (orig) => ({ ...(await orig<typeof import("../../lib/motion")>()), registerMotion: () => {}, reduced: () => false }));

let state: SessionState = initialState();
const dispatch = vi.fn();
vi.mock("next/navigation", () => ({
  useRouter: () => ({ replace: vi.fn(), push: vi.fn() }),
  usePathname: () => "/radar/p1",
  useSearchParams: () => new URLSearchParams("planb=stock"),
}));
vi.mock("../../state/session", async (orig) => ({
  ...(await orig<typeof import("../../state/session")>()),
  useSession: () => ({ state, dispatch }),
}));

// jsdom has no matchMedia; the mascot's gsap.matchMedia needs one (reduced motion → no hop).
window.matchMedia = ((q: string) => ({ matches: q.includes("reduce"), media: q, addListener() {}, removeListener() {}, addEventListener() {}, removeEventListener() {} })) as unknown as typeof window.matchMedia;
afterEach(cleanup);

const row = (id: string, price: number, distanceM: number): OfferRow => ({
  offer: { offerId: `o_${id}`, productId: "p1", storeId: id, priceToman: price, updatedMinAgo: 30, stock: "unknown" },
  store: {
    id, name: `فروشگاه ${id}`, mall: "پاساژ علاءالدین", floor: "1", unit: "5", venueSlug: "v", locationHint: null,
    parseConfidence: 1, address: "", locationLabel: "", lat: 35.69, lng: 51.41, distanceM, weeklyHours: {}, installment: null, contact: null,
  },
});
const rows = [row("a", 30_000_000, 200), row("b", 32_000_000, 900), row("c", 28_000_000, 3000), row("d", 29_000_000, 50)];
const withState = (p: Partial<SessionState>) => (state = { ...initialState(), ...p });
const failA = { failures: [{ storeId: "a", reason: "stock" as const, at: 0 }], previousPlan: { storeId: "a" } };

describe("PlanB", () => {
  it("every shop failed → the diagnosis card, never an empty list", () => {
    withState({ failures: rows.map((r) => ({ storeId: r.store.id, reason: "stock" as const, at: 0 })) });
    render(<PlanB rows={rows} />);
    expect(screen.getByText("گزینه‌ی جایگزینی نموند")).toBeTruthy();
    expect(screen.getByRole("button", { name: "برگشت به میز تصمیم" })).toBeTruthy();
    expect(screen.queryByRole("list", { name: "گزینه‌های جایگزین" })).toBeNull();
  });

  it("no priority yet → the prompt and no rows", () => {
    withState({ ...failA, planB: { open: true, reason: "stock", priority: null } });
    render(<PlanB rows={rows} />);
    expect(screen.getByRole("dialog")).toBeTruthy();
    expect(screen.getByText("موجودی تأیید نشد", { exact: false })).toBeTruthy();
    expect(screen.getByText("حالا بگو چی برات مهم‌تره:")).toBeTruthy();
    expect(screen.queryByRole("list", { name: "گزینه‌های جایگزین" })).toBeNull();
  });

  it("price priority → remaining shops cheapest first, the failed one left out", () => {
    withState({ ...failA, planB: { open: true, reason: "stock", priority: "price" } });
    render(<PlanB rows={rows} />);
    const items = within(screen.getByRole("list", { name: "گزینه‌های جایگزین" })).getAllByRole("listitem");
    expect(items.map((li) => within(li).getByRole("heading").textContent)).toEqual(["فروشگاه c", "فروشگاه d", "فروشگاه b"]);
    expect(screen.getByRole("button", { name: /قیمت مهم‌تره/ }).getAttribute("aria-pressed")).toBe("true");
    expect(screen.getByRole("button", { name: /قیمت مهم‌تره/ }).className).not.toContain("animate-chip-pop"); // a stored pick never pops
  });

  it("every alternative shows its price age (PLAN §2 rule 1) and the footer credit", () => {
    withState({ ...failA, planB: { open: true, reason: "stock", priority: "price" } });
    render(<PlanB rows={rows} />);
    for (const li of within(screen.getByRole("list", { name: "گزینه‌های جایگزین" })).getAllByRole("listitem"))
      expect(li.textContent).toContain("به‌روزرسانی");
    expect(screen.getByText("محصول رسمی ترب نیست", { exact: false })).toBeTruthy();
  });

  it("accept patches the trip with only the newest failure; a failed patch alerts and stays", async () => {
    const onAccepted = vi.fn();
    const earlier = { storeId: "b", reason: "closed" as const, at: 0 };
    withState({ ...failA, failures: [earlier, ...failA.failures], tripId: "t1", planB: { open: true, reason: "stock", priority: "price" } });
    const patch = vi.spyOn(api, "patchTrip").mockRejectedValueOnce(new Error("down"));
    render(<PlanB rows={rows} onAccepted={onAccepted} />);
    fireEvent.click(screen.getAllByRole("button", { name: "انتخاب این فروشگاه" })[0]);
    await waitFor(() => expect(screen.getByRole("alert")).toBeTruthy());
    expect(patch).toHaveBeenCalledWith("t1", { chosenShopId: "c", failures: [failA.failures[0]] });
    expect(onAccepted).not.toHaveBeenCalled();
    expect(dispatch).not.toHaveBeenCalledWith(expect.objectContaining({ type: "PLANB_ACCEPT" }));
    patch.mockResolvedValueOnce({} as never);
    fireEvent.click(screen.getAllByRole("button", { name: "انتخاب این فروشگاه" })[0]);
    await waitFor(() => expect(onAccepted).toHaveBeenCalled());
  });

  it("changing priority re-ranks with Flip and keeps every row", () => {
    withState({ ...failA, planB: { open: true, reason: "stock", priority: "price" } });
    const { rerender } = render(<PlanB rows={rows} />);
    const names = () => within(screen.getByRole("list", { name: "گزینه‌های جایگزین" })).getAllByRole("heading").map((h) => h.textContent);
    const before = names();
    dispatch.mockImplementationOnce((a) => withState({ ...state, planB: { ...state.planB, priority: a.priority } }));
    const near = screen.getByRole("button", { name: /نزدیکی مهم‌تره/ });
    fireEvent.pointerDown(near); // a pointer click
    fireEvent.click(near);
    expect(Flip.getState).toHaveBeenCalled();
    rerender(<PlanB rows={rows} />);
    expect(names()).not.toEqual(before);
    expect([...names()].sort()).toEqual([...before].sort());
    expect(Flip.from).toHaveBeenCalledTimes(1);
  });

  it("a keyboard activation re-ranks without Flip", () => {
    vi.mocked(Flip.getState).mockClear();
    vi.mocked(Flip.from).mockClear();
    withState({ ...failA, planB: { open: true, reason: "stock", priority: "price" } });
    const { rerender } = render(<PlanB rows={rows} />);
    dispatch.mockImplementationOnce((a) => withState({ ...state, planB: { ...state.planB, priority: a.priority } }));
    const near = screen.getByRole("button", { name: /نزدیکی مهم‌تره/ });
    fireEvent.keyDown(near, { key: "Enter" }); // Enter/Space: the shared byKeyboard() sees the key
    fireEvent.click(near);
    rerender(<PlanB rows={rows} />);
    expect(dispatch).toHaveBeenCalledWith({ type: "PLANB_PRIORITY", priority: "distance" });
    expect(Flip.getState).not.toHaveBeenCalled();
    expect(Flip.from).not.toHaveBeenCalled();
  });
});
