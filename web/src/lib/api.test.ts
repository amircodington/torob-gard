import { afterEach, expect, it, vi } from "vitest";
import { api, mapOfferRow } from "./api";

const raw = {
  offer_id: "o1",
  price: 23_500_000,
  last_price_changed_at: "2026-10-22T10:00:00Z",
  stock: "confirmed" as const,
  shop: {
    id: "s1", name: "موبایل نمونه", venue_name: "پاساژ علاءالدین", venue_slug: "aladdin",
    floor: null, unit: null, location_hint: "کنار پله", parse_confidence: 0.5,
    address: "تهران", location_label: "جمهوری", lat: 35.69, lng: 51.41, distance_m: 420,
    weekly_hours: {}, installment: null, contact: null,
  },
};

afterEach(() => vi.unstubAllGlobals());

it("maps a raw offer row to the prototype shape", () => {
  const now = new Date("2026-10-22T12:00:00Z");
  const { offer, store } = mapOfferRow(raw, now);
  expect(offer).toMatchObject({ offerId: "o1", storeId: "s1", priceToman: 23_500_000, stock: "confirmed" });
  expect(offer.updatedMinAgo).toBe(120);
  expect(store.floor).toBeNull();
  expect(store.unit).toBeNull();
  expect(store.distanceM).toBe(420);
  expect(store).toMatchObject({ mall: "پاساژ علاءالدین", venueSlug: "aladdin", parseConfidence: 0.5, locationHint: "کنار پله" });
});

it("posts the desk request as snake_case JSON", async () => {
  const fetchMock = vi.fn(async () => new Response(JSON.stringify({ tiers: [] }), { status: 200 }));
  vi.stubGlobal("fetch", fetchMock);
  const out = await api.desk({ category: "mobile", budgetMin: 0, budgetMax: 25_000_000, priority: "camera" });
  expect(out).toEqual([]);
  const [url, init] = fetchMock.mock.calls[0] as unknown as [string, RequestInit];
  expect(url).toBe("/api/desk");
  expect(init.method).toBe("POST");
  expect(JSON.parse(init.body as string)).toEqual({ category: "mobile", budget_min: 0, budget_max: 25_000_000, priority: "camera" });
});

it("throws ApiError on non-2xx", async () => {
  vi.stubGlobal("fetch", vi.fn(async () => new Response("nope", { status: 404 })));
  await expect(api.product("x")).rejects.toMatchObject({ status: 404, body: "nope" });
});
