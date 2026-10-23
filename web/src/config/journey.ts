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
  // ponytail: edges from the 2026-10-23 price quartiles (products with ≥ 2 offers) — revisit after T-09
  tablet: [
    { id: "t1", label: "تا ۷۰ میلیون", min: 0, max: 70_000_000 },
    { id: "t2", label: "۷۰ تا ۲۰۰ میلیون", min: 70_000_000, max: 200_000_000 },
    { id: "t3", label: "بالای ۲۰۰ میلیون", min: 200_000_000, max: null },
    { id: "t4", label: "مهم نیست", min: 0, max: null },
  ],
  tv: [
    { id: "v1", label: "تا ۱۰۰ میلیون", min: 0, max: 100_000_000 },
    { id: "v2", label: "۱۰۰ تا ۲۵۰ میلیون", min: 100_000_000, max: 250_000_000 },
    { id: "v3", label: "بالای ۲۵۰ میلیون", min: 250_000_000, max: null },
    { id: "v4", label: "مهم نیست", min: 0, max: null },
  ],
  headphone: [
    { id: "h1", label: "تا ۲ میلیون", min: 0, max: 2_000_000 },
    { id: "h2", label: "۲ تا ۱۰ میلیون", min: 2_000_000, max: 10_000_000 },
    { id: "h3", label: "بالای ۱۰ میلیون", min: 10_000_000, max: null },
    { id: "h4", label: "مهم نیست", min: 0, max: null },
  ],
  powerbank: [
    { id: "b1", label: "تا ۴ میلیون", min: 0, max: 4_000_000 },
    { id: "b2", label: "۴ تا ۸ میلیون", min: 4_000_000, max: 8_000_000 },
    { id: "b3", label: "بالای ۸ میلیون", min: 8_000_000, max: null },
    { id: "b4", label: "مهم نیست", min: 0, max: null },
  ],
  photo: [
    { id: "c1", label: "تا ۴۰ میلیون", min: 0, max: 40_000_000 },
    { id: "c2", label: "۴۰ تا ۱۵۰ میلیون", min: 40_000_000, max: 150_000_000 },
    { id: "c3", label: "بالای ۱۵۰ میلیون", min: 150_000_000, max: null },
    { id: "c4", label: "مهم نیست", min: 0, max: null },
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
  // ids match api/catalog/desk_config.py DESK_PRIORITIES
  tablet: [
    { id: "screen", label: "صفحه‌ی بزرگ‌تر", hint: "فیلم، کتاب، نقاشی" },
    { id: "battery", label: "باتری بیشتر", hint: "دوام بیرون از خونه" },
    { id: "storage", label: "حافظه‌ی بیشتر", hint: "عکس و برنامه‌ی زیاد" },
  ],
  tv: [
    { id: "size", label: "صفحه‌ی بزرگ‌تر", hint: "اینچ بیشتر" },
    { id: "quality", label: "کیفیت تصویر", hint: "۴K و رزولوشن بالاتر" },
  ],
  headphone: [
    { id: "anc", label: "نویز کنسلینگ", hint: "مترو، خیابون، کافه" },
    { id: "playtime", label: "باتری و زمان پخش", hint: "ساعت‌ها بدون شارژ" },
    { id: "price", label: "قیمت مهم‌تره", hint: "به‌صرفه باشه" },
  ],
  powerbank: [
    { id: "capacity", label: "ظرفیت بیشتر", hint: "چند بار شارژ گوشی" },
    { id: "fast", label: "شارژ سریع", hint: "وات بالاتر" },
    { id: "light", label: "سبک و جیبی", hint: "وزن کمتر" },
  ],
  photo: [
    { id: "resolution", label: "مگاپیکسل بیشتر", hint: "جزئیات و چاپ بزرگ" },
    { id: "speed", label: "عکاسی پیاپی سریع", hint: "ورزش و حیات وحش" },
    { id: "light", label: "سبک و سفری", hint: "وزن کمتر" },
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
