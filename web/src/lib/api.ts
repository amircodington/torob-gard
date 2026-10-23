/* Typed client for the Django API; snake_case → camelCase happens here and only here. */
import type { Anchor, CategoryPage, Me, NeedsProfile, DeskTier, FailureRecord, OfferRow, Product, ProductCard, ShopDetail, ShopHit, SitemapData, Stats, Store, Trip, Venue, VenueDetail } from "./types";

// Relative: a Next.js rewrite to the Django server lands in Task 6. Server components set API_URL.
const API = "/api";
const apiBase = () => `${process.env.API_URL ?? ""}${API}`;

export class ApiError extends Error {
  constructor(public status: number, public body: string) {
    super(`API ${status}: ${body.slice(0, 200)}`);
  }
}

async function request<T>(path: string, init: RequestInit = {}): Promise<T> {
  const res = await fetch(`${apiBase()}${path}`, {
    ...init,
    cache: "no-store",
    headers: { "Content-Type": "application/json", ...init.headers },
  });
  if (!res.ok) throw new ApiError(res.status, await res.text());
  return (res.status === 204 ? undefined : res.json()) as Promise<T>;
}

const send = (method: string, body: unknown): RequestInit => ({ method, body: JSON.stringify(body) });

/* ------------------------------ raw shapes ------------------------------ */

type Raw = Record<string, any>; // eslint-disable-line @typescript-eslint/no-explicit-any -- ponytail: hand mappers, no schema lib

export interface RawOfferRow {
  offer_id: string;
  price: number;
  last_price_changed_at: string;
  stock: "confirmed" | "unknown";
  shop: Raw;
}

/* -------------------------------- mappers -------------------------------- */

export function mapStore(s: Raw): Store {
  return {
    id: s.id, name: s.name, mall: s.venue_name, floor: s.floor, unit: s.unit,
    venueSlug: s.venue_slug, locationHint: s.location_hint, parseConfidence: s.parse_confidence,
    address: s.address, locationLabel: s.location_label, lat: s.lat, lng: s.lng,
    distanceM: s.distance_m, weeklyHours: s.weekly_hours ?? {}, installment: s.installment, contact: s.contact,
  };
}

export function mapOfferRow(raw: RawOfferRow, now: Date, productId = ""): OfferRow {
  const store = mapStore(raw.shop);
  const updatedMinAgo = Math.max(0, Math.round((now.getTime() - Date.parse(raw.last_price_changed_at)) / 60_000));
  return {
    offer: { offerId: raw.offer_id, productId, storeId: store.id, priceToman: raw.price, updatedMinAgo, stock: raw.stock },
    store,
  };
}

const mapTier = (t: Raw): DeskTier => ({
  tier: t.tier, productId: t.product_id, title: t.title, brand: t.brand, imageUrl: t.image_url,
  specsTop3: t.specs_top3, price: t.price, offerCount: t.offer_count, newestPriceAt: t.newest_price_at,
  bullets: t.bullets, tradeoffs: t.tradeoffs, fitNote: t.fit_note, fitsPriority: t.fits_priority,
});

const mapProduct = (p: Raw): Product => ({
  id: p.id, title: p.title, brand: p.brand, imageUrls: p.image_urls, specs: p.specs,
  minPrice: p.min_price, medianPrice: p.median_price, maxPrice: p.max_price, offerCount: p.offer_count,
  categoryName: p.category_name, categorySlug: p.category_slug,
});

const mapTrip = (t: Raw): Trip => ({
  id: t.id, createdAt: t.created_at, productId: t.product_id, chosenShopId: t.chosen_shop_id,
  req: t.req, failures: t.failures, anchor: t.anchor,
  product: {
    id: t.product.id, title: t.product.title, brand: t.product.brand, imageUrl: t.product.image_url,
    minPrice: t.product.min_price, medianPrice: t.product.median_price, maxPrice: t.product.max_price,
    offerCount: t.product.offer_count,
  },
  shop: t.shop ? mapStore(t.shop) : null,
});

const mapProfile = (p: Raw): NeedsProfile => ({
  budgetMin: p.budget_min, budgetMax: p.budget_max, preferredBrands: p.preferred_brands,
  avoidedBrands: p.avoided_brands, styleTags: p.style_tags, notes: p.notes,
});

export const mapMe = (m: Raw): Me => ({
  displayName: m.display_name, phoneMasked: m.phone_masked, trips: m.trips.map(mapTrip), profile: mapProfile(m.profile),
  memory: m.memory.map((x: Raw) => ({
    id: x.id, state: x.state, productId: x.product_id, productTitle: x.product_title, imageUrl: x.image_url,
    shopId: x.shop_id, shopName: x.shop_name, priceSeen: x.price_seen, note: x.note, createdAt: x.created_at,
  })),
});

/* -------------------------------- inputs -------------------------------- */

export interface PriceCheck {
  min: number | null;
  median: number | null;
  max: number | null;
  verdict: "below" | "fair" | "high" | "unknown";
  pctVsMedian: number | null;
  newestPriceAt: string | null;
}

export interface DeskInput { category: string; budgetMin: number; budgetMax: number | null; priority: string | null }
export interface ReportInput { shopId: string; productId?: string; kind: "no_answer" | "no_item" | "closed" | "had_item" | "open" }
export interface TripInput {
  productId: string;
  chosenShopId?: string | null;
  req: Record<string, unknown>;
  failures: FailureRecord[];
  anchor: Partial<Anchor>;
}
export interface TripPatch { chosenShopId?: string; failures?: FailureRecord[] }

/* --------------------------------- api --------------------------------- */

export const api = {
  stats: async (): Promise<Stats> => {
    const s = await request<Raw>("/stats");
    return { shops: s.shops, venues: s.venues, products: s.products, offers: s.offers, newestPriceAt: s.newest_price_at };
  },
  venues: async (limit = 12): Promise<Venue[]> =>
    (await request<Raw[]>(`/venues?limit=${limit}`)).map((v) => ({
      slug: v.slug, name: v.name, shopCount: v.shop_count, lat: v.lat, lng: v.lng,
    })),
  desk: async (i: DeskInput): Promise<DeskTier[]> =>
    (await request<Raw>("/desk", send("POST", {
      category: i.category, budget_min: i.budgetMin, budget_max: i.budgetMax, priority: i.priority,
    }))).tiers.map(mapTier),
  /** The agent's rewrite of the template text, by product id; a tier it could not ground is absent. */
  explain: async (tiers: DeskTier[], i: DeskInput, sessionId?: string | null): Promise<Record<string, Pick<DeskTier, "bullets" | "tradeoffs" | "fitNote">>> => {
    const res = await fetch("/agent/explain", {
      cache: "no-store", headers: { "Content-Type": "application/json" }, signal: AbortSignal.timeout(8000),
      ...send("POST", {
        session_id: sessionId ?? undefined,
        tiers: tiers.map((t) => ({ tier: t.tier, product_id: t.productId, title: t.title, specs_top3: t.specsTop3, price: t.price, offer_count: t.offerCount, bullets: t.bullets, tradeoffs: t.tradeoffs, fit_note: t.fitNote })),
        req: { category: i.category, budget_min: i.budgetMin, budget_max: i.budgetMax, priority: i.priority },
      }),
    });
    if (!res.ok) throw new ApiError(res.status, await res.text());
    const r: Record<string, Raw> = await res.json();
    return Object.fromEntries(Object.entries(r).map(([id, e]) => [id, { bullets: e.bullets, tradeoffs: e.tradeoffs, fitNote: e.fit_note }]));
  },
  venue: async (slug: string): Promise<VenueDetail> => {
    const v = await request<Raw>(`/venues/${encodeURIComponent(slug)}`);
    return {
      slug: v.slug, name: v.name, address: v.address, lat: v.lat, lng: v.lng, verifiedAt: v.verified_at,
      floors: v.floors.map((f: Raw) => ({ floor: f.floor, label: f.label, shops: f.shops.map(mapStore) })),
      topCategories: v.top_categories,
    };
  },
  shop: async (id: string): Promise<ShopDetail> => {
    const s = await request<Raw>(`/shops/${encodeURIComponent(id)}`);
    return {
      ...mapStore(s), offerCount: s.offer_count,
      offers: s.offers.map((o: Raw) => ({ productId: o.product_id, title: o.title, imageUrl: o.image_url, price: o.price, lastPriceChangedAt: o.last_price_changed_at })),
    };
  },
  category: async (slug: string): Promise<CategoryPage> => {
    const c = await request<Raw>(`/categories/${encodeURIComponent(slug)}`);
    return {
      slug: c.slug, name: c.name, priceQuantiles: c.price_quantiles, topVenues: c.top_venues,
      popularProducts: c.popular_products.map((p: Raw) => ({ id: p.id, title: p.title, brand: p.brand, imageUrl: p.image_url, minPrice: p.min_price, offerCount: p.offer_count, priceAt: p.price_at })),
    };
  },
  search: async (q: string): Promise<{ products: ProductCard[]; shops: ShopHit[] }> => {
    const r = await request<Raw>(`/search?q=${encodeURIComponent(q)}`);
    return {
      products: r.products.map((p: Raw) => ({ id: p.id, title: p.title, brand: p.brand, imageUrl: p.image_url, minPrice: p.min_price, offerCount: p.offer_count, priceAt: p.price_at })),
      shops: r.shops.map((s: Raw) => ({ id: s.id, name: s.name, venueName: s.venue_name, venueSlug: s.venue_slug, floor: s.floor, unit: s.unit, parseConfidence: s.parse_confidence })),
    };
  },
  sitemap: async (): Promise<SitemapData> => {
    const r = await request<Raw>("/sitemap");
    return { venues: r.venues, categories: r.categories, shops: r.shops, productPages: r.product_pages };
  },
  sitemapProducts: (page: number) => request<string[]>(`/sitemap/products?page=${page}`),
  product: async (id: string): Promise<Product> => mapProduct(await request<Raw>(`/products/${encodeURIComponent(id)}`)),
  offerRows: async (productId: string, anchor?: Anchor): Promise<OfferRow[]> => {
    const q = anchor ? `?lat=${anchor.lat}&lng=${anchor.lng}` : "";
    const raw = await request<RawOfferRow[]>(`/products/${encodeURIComponent(productId)}/offers${q}`);
    const now = new Date();
    return raw.map((r) => mapOfferRow(r, now, productId));
  },
  /** The agent's shop_cards: offer ids → radar rows (≤ 3, order kept). */
  offersById: async (ids: string[]): Promise<OfferRow[]> => {
    const raw = await request<(RawOfferRow & { product_id: string })[]>(`/offers?ids=${ids.map(encodeURIComponent).join(",")}`);
    const now = new Date();
    return raw.map((r) => mapOfferRow(r, now, r.product_id));
  },
  /** The agent's price_check tool, no LLM (agent/torobgard_agent/api.py). */
  priceCheck: async (productId: string, quotedPrice: number): Promise<PriceCheck> => {
    const res = await fetch("/agent/price_check", { cache: "no-store", headers: { "Content-Type": "application/json" }, ...send("POST", { product_id: productId, quoted_price: quotedPrice }) });
    if (!res.ok) throw new ApiError(res.status, await res.text());
    const r: Raw = await res.json();
    return { min: r.min, median: r.median, max: r.max, verdict: r.verdict, pctVsMedian: r.pct_vs_median, newestPriceAt: r.newest_price_at };
  },
  report: (i: ReportInput) =>
    request<{ id: string }>("/reports", send("POST", { shop_id: i.shopId, product_id: i.productId ?? null, kind: i.kind })),
  createTrip: async (i: TripInput): Promise<Trip> =>
    mapTrip(await request<Raw>("/trips", send("POST", {
      product_id: i.productId, chosen_shop_id: i.chosenShopId ?? null, req: i.req, failures: i.failures, anchor: i.anchor,
    }))),
  /** Phone login (people/api.py). The session cookie is httpOnly; these only ever run in the browser. */
  requestOtp: (phone: string) => request<void>("/auth/otp/request", send("POST", { phone })),
  verifyOtp: async (phone: string, code: string, agentSessionId?: string | null): Promise<Me> =>
    mapMe(await request<Raw>("/auth/otp/verify", send("POST", { phone, code, agent_session_id: agentSessionId ?? null }))),
  logout: () => request<void>("/auth/logout", { method: "POST" }),
  /** null for a guest (401). */
  me: async (): Promise<Me | null> => {
    try {
      return mapMe(await request<Raw>("/me"));
    } catch (e) {
      if (e instanceof ApiError && e.status === 401) return null;
      throw e;
    }
  },
  patchProfile: async (p: Partial<NeedsProfile>): Promise<NeedsProfile> =>
    mapProfile(await request<Raw>("/me/profile", send("PATCH", {
      budget_min: p.budgetMin, budget_max: p.budgetMax, preferred_brands: p.preferredBrands,
      avoided_brands: p.avoidedBrands, style_tags: p.styleTags, notes: p.notes,
    }))),
  deleteMe: () => request<void>("/me", { method: "DELETE" }),
  trip: async (id: string): Promise<Trip> => mapTrip(await request<Raw>(`/trips/${encodeURIComponent(id)}`)),
  patchTrip: async (id: string, p: TripPatch): Promise<Trip> =>
    mapTrip(await request<Raw>(`/trips/${encodeURIComponent(id)}`, send("PATCH", {
      chosen_shop_id: p.chosenShopId, failures: p.failures,
    }))),
};
