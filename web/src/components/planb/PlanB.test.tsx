// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { api } from "../../lib/api";
import type { OfferRow } from "../../lib/types";
import { initialState, type SessionState } from "../../state/session";
import { PlanB } from "./PlanB";

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
});
