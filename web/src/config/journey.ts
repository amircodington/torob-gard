import type { BudgetBand, Category, Priority } from "../lib/types";
import type { Action } from "../state/session";

// ponytail: edges from docs/evidence/P0/budget-quantiles.md — provisional until T-09 price sanity
export const BUDGETS: Record<Category, BudgetBand[]> = {
  mobile: [
    { id: "m1", label: "تا ۵ میلیون", min: 0, max: 5_000_000 },
    { id: "m2", label: "۵ تا ۵۰ میلیون", min: 5_000_000, max: 50_000_000 },
    { id: "m3", label: "بالای ۵۰ میلیون", min: 50_000_000, max: null },
    { id: "m4", label: "مهم نیست", min: 0, max: null },
  ],
  laptop: [
    { id: "l1", label: "تا ۱۸۰ میلیون", min: 0, max: 180_000_000 },
    { id: "l2", label: "۱۸۰ تا ۲۴۰ میلیون", min: 180_000_000, max: 240_000_000 },
    { id: "l3", label: "۲۴۰ تا ۳۸۰ میلیون", min: 240_000_000, max: 380_000_000 },
    { id: "l4", label: "بالای ۳۸۰ میلیون", min: 380_000_000, max: null },
    { id: "l5", label: "مهم نیست", min: 0, max: null },
  ],
  accessory: [
    { id: "a1", label: "تا ۱ میلیون", min: 0, max: 1_000_000 },
    { id: "a2", label: "بالای ۱ میلیون", min: 1_000_000, max: null },
    { id: "a3", label: "مهم نیست", min: 0, max: null },
  ],
  other: [],
};

export const PRIORITIES: Record<Category, Priority[]> = {
  mobile: [
    { id: "camera", label: "دوربین مهم‌تره", hint: "عکاسی، ویدیو، شب" },
    { id: "battery", label: "باتری مهم‌تره", hint: "دوام یک روز دانشگاه" },
    { id: "both", label: "هر دو مهمن", hint: "تعادل بین دوربین و باتری" },
  ],
  laptop: [
    { id: "weight", label: "سبکی و حمل راحت", hint: "هر روز تو کوله" },
    { id: "power", label: "قدرت پردازش", hint: "کارهای سنگین‌تر" },
    { id: "both2", label: "هر دو مهمن", hint: "تعادل" },
  ],
  accessory: [
    { id: "price", label: "قیمت مهم‌تره", hint: "به‌صرفه باشه" },
    { id: "brand", label: "برند و کیفیت", hint: "دوام بیشتر" },
  ],
  other: [],
};

/** Seeded conversations, replayed through the reducer by `SEED` (`/start?seed=phone-camera`). */
export const SEEDS: Record<string, Action[]> = {
  "phone-camera": [
    { type: "CHAT_TEXT", text: "یه گوشی برای عکاسی و دانشگاه می‌خوام" },
    { type: "CHAT_CHIP", chip: { id: "budget:m2", label: "۵ تا ۵۰ میلیون" } },
    { type: "CHAT_CHIP", chip: { id: "prio:camera", label: "دوربین مهم‌تره" } },
  ],
};
