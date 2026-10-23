/* Domain types — ported from the prototype, Store/Offer reshaped to the real API (camelCase). */

export type Category = "mobile" | "laptop" | "accessory" | "other";

// The prototype's "unconfirmed" is dropped: the API never sends no_item rows.
export type StockStatus = "confirmed" | "unknown";

export type Tier = "budget" | "balanced" | "feature";

export interface BudgetBand {
  id: string;
  label: string; // e.g. «۱۵ تا ۲۵ میلیون»
  min: number; // Toman
  max: number | null; // null = بدون سقف
}

export interface Priority {
  id: string;
  label: string;
  hint: string;
}

export interface Requirements {
  category: Category | null;
  goalText: string;
  budgetId: string | null;
  priorityId: string | null;
}

export interface Spec {
  label: string;
  value: string;
}

/** POST /api/desk → one tier */
export interface DeskTier {
  tier: Tier;
  productId: string;
  title: string;
  brand: string | null;
  imageUrl: string | null;
  specsTop3: Spec[];
  price: number;
  offerCount: number;
  newestPriceAt: string | null;
  bullets: string[];
  tradeoffs: string[];
  fitNote: string;
  fitsPriority: boolean;
}

/** GET /api/products/{id} */
export interface Product {
  id: string;
  title: string;
  brand: string | null;
  imageUrls: string[];
  specs: Record<string, unknown>[];
  minPrice: number | null;
  medianPrice: number | null;
  maxPrice: number | null;
  offerCount: number;
  categoryName: string;
  categorySlug: string;
}

export interface Stats {
  shops: number;
  venues: number;
  products: number;
  offers: number;
  newestPriceAt: string | null;
}

export interface Venue {
  slug: string;
  name: string;
  shopCount: number;
  lat: number | null;
  lng: number | null;
}

/** Raw Torob weekly hours, keys sat…fri; `{}` = not declared. */
export type WeeklyHours = Record<string, { status: string; shifts: { start_time: string; end_time: string }[] }>;

export interface Store {
  id: string;
  name: string;
  mall: string | null; // venue name, «پاساژ علاءالدین»
  floor: string | null;
  unit: string | null;
  venueSlug: string | null;
  locationHint: string | null;
  parseConfidence: number;
  address: string;
  locationLabel: string;
  lat: number | null;
  lng: number | null;
  distanceM: number | null; // from the anchor; null when no anchor or no geom
  weeklyHours: WeeklyHours;
  installment: boolean | null; // null = اطلاعاتی در دسترس نیست
  contact: string | null; // null = «ثبت نشده»
}

export interface Offer {
  offerId: string;
  productId: string;
  storeId: string;
  priceToman: number;
  /** minutes since last_price_changed_at, computed at mapping time */
  updatedMinAgo: number;
  stock: StockStatus;
}

export interface OfferRow {
  offer: Offer;
  store: Store;
}

export type SortKey = "price" | "distance" | "freshness";

export interface RadarFilters {
  maxPrice: number | null; // Toman
  maxDistanceKm: number | null;
  openNow: boolean;
  installment: boolean;
}

export type FailReason = "no-answer" | "stock" | "closed";

export type RecoveryPriority = "price" | "distance" | "trust";

export interface FailureRecord {
  storeId: string;
  reason: FailReason;
  at: number;
}

export interface Anchor {
  lat: number;
  lng: number;
}

export interface Trip {
  id: string;
  createdAt: string;
  productId: string;
  chosenShopId: string | null;
  req: Record<string, unknown>;
  failures: FailureRecord[];
  anchor: Partial<Anchor>;
  product: { id: string; title: string; brand: string | null; imageUrl: string | null; minPrice: number | null; medianPrice: number | null; maxPrice: number | null; offerCount: number };
  shop: Store | null;
}

export interface MemoryItem {
  id: string;
  state: "seen" | "liked" | "tried" | "bought" | "skipped";
  productId: string | null;
  productTitle: string | null;
  imageUrl: string | null;
  shopId: string | null;
  shopName: string | null;
  priceSeen: number | null;
  note: string | null;
  createdAt: string;
}

export interface NeedsProfile {
  budgetMin: number | null;
  budgetMax: number | null;
  preferredBrands: string[];
  avoidedBrands: string[];
  styleTags: string[];
  notes: string;
}

export interface Me {
  displayName: string | null;
  phoneMasked: string | null;
  trips: Trip[];
  memory: MemoryItem[];
  profile: NeedsProfile;
}

export interface ChatMsg {
  id: number;
  from: "assistant" | "user";
  text: string;
  chipIds?: string[];
}

/* ------------------------- public catalog pages (P3) ------------------------- */

export interface NamedCount {
  name: string;
  slug: string;
  count: number;
}

/** GET /api/venues/{slug}: floors in order -1, 0, 1 …, then «طبقه نامشخص». */
export interface VenueDetail {
  slug: string;
  name: string;
  address: string;
  lat: number | null;
  lng: number | null;
  verifiedAt: string | null;
  floors: { floor: string | null; label: string; shops: Store[] }[];
  topCategories: NamedCount[];
}

export interface ShopOffer {
  productId: string;
  title: string;
  imageUrl: string | null;
  price: number;
  lastPriceChangedAt: string;
}

export interface ShopDetail extends Store {
  offerCount: number;
  offers: ShopOffer[];
}

export type ProductCard = CategoryPage["popularProducts"][number];

export interface ShopHit { id: string; name: string; venueName: string | null; venueSlug: string | null; floor: string | null; unit: string | null; parseConfidence: number }

export interface SitemapData { venues: string[]; categories: string[]; shops: string[]; productPages: number }

export interface CategoryPage {
  slug: string;
  name: string;
  /** p10 … p90 of model min prices; {} when too few priced models */
  priceQuantiles: Partial<Record<"p10" | "p25" | "p50" | "p75" | "p90", number>>;
  topVenues: NamedCount[];
  popularProducts: { id: string; title: string; brand: string | null; imageUrl: string | null; minPrice: number; offerCount: number; priceAt: string | null }[];
}
