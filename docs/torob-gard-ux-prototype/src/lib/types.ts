/* ------------------------------------------------------------------
 * Domain types — Torob Gard prototype
 * These mirror the fields the engineering team should expose
 * from real Torob APIs (product specs, offers, store profile, …).
 * ------------------------------------------------------------------ */

export type Category = "mobile" | "laptop" | "accessory" | "other";

export type StockStatus = "confirmed" | "unconfirmed" | "unknown";

export type Tier = "budget" | "balanced" | "feature";

export interface BudgetBand {
  id: string;
  label: string;        // e.g. «۱۵ تا ۲۵ میلیون»
  min: number;          // Toman
  max: number | null;   // null = بدون سقف
}

export interface Requirements {
  category: Category | null;
  goalText: string;
  budgetId: string | null;
  priorityId: string | null;
}

export interface Product {
  id: string;
  category: Category;
  tier: Tier;
  name: string;             // «سامسونگ گلکسی A55»
  shortName: string;        // «گلکسی A55»
  specs: { label: string; value: string }[];
  bullets: string[];        // چرا این گزینه؟ (نقاط قوت)
  tradeoffs: string[];      // کجا کوتاه می‌آد (صادقانه)
  fitNote: string;          // توضیح تناسب با نیاز کاربر (قالب پویا)
  keywords: string[];       // برای تشخیص تناسب با اولویت کاربر
}

export interface StoreGeo {
  lat: number;   // مختصات نمایشی تهران — صرفاً برای لینک نقشه
  lng: number;
}

export interface Store {
  id: string;
  name: string;
  mall?: string;      // «پاساژ پایتخت»
  floor?: string;     // «طبقه‌ی ۲»
  unit?: string;      // «واحد ۲۱۴»
  street?: string;    // آدرس خیابانی
  neighborhood: string;
  distanceKm: number; // فاصله از نقطه‌ی کاربر (داده‌ی نمایشی هماهنگ با نقشه)
  mapX: number;       // موقعیت روی نقشه‌ی شماتیک (۰–۱۰۰)
  mapY: number;
  geo: StoreGeo;
  hours: { opens: string; closes: string; fridayNote?: string } | null; // null = ثبت نشده
  installment: boolean | null; // null = اطلاعاتی در دسترس نیست
  contact: string | null;      // null در نسخه‌ی نمایشی = «ثبت نشده»
}

export interface Offer {
  productId: string;
  storeId: string;
  priceToman: number;
  /** دقایق گذشته از آخرین به‌روزرسانی قیمت در لحظه‌ی ساخت دمو */
  updatedMinAgo: number;
  sourceNote: string;   // «ثبت فروشگاه در ترب»
  stock: StockStatus;
}

export type SortKey = "price" | "distance" | "freshness";

export interface RadarFilters {
  maxPrice: number | null;     // Toman
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

export interface ChatMsg {
  id: number;
  from: "assistant" | "user";
  text: string;
  chipIds?: string[];      // شناسه‌ی گروه چیپ‌ها بعد از پیام
}
