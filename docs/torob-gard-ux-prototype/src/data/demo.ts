/* ==================================================================
 *  ⚠ DEMO DATASET — «سناریوی نمایشی»  (src/data/demo.ts)
 *  ------------------------------------------------------------------
 *  ALL data below is fictional, hand-authored demo content for the
 *  Torob Gard hackathon prototype. It is NOT sourced from Torob APIs.
 *  • Prices, timestamps, distances, addresses, stock statuses: demo.
 *  • No phone numbers are included (contact = null → «ثبت نشده»).
 *  • Keep units consistent: Toman, minutes-ago, km, map coords 0-100.
 *  Engineering handoff: replace this module with real
 *  product / offer / store responses. UI imports only this file.
 * ================================================================== */

import type {
  BudgetBand,
  Category,
  Offer,
  Product,
  Store,
} from "../lib/types";

export const DEMO_LABEL = "سناریوی نمایشی";

/* ---------------- budget bands per category ---------------- */

export const BUDGETS: Record<Category, BudgetBand[]> = {
  mobile: [
    { id: "m1", label: "تا ۱۵ میلیون", min: 0, max: 15_000_000 },
    { id: "m2", label: "۱۵ تا ۲۵ میلیون", min: 15_000_000, max: 25_000_000 },
    { id: "m3", label: "۲۵ تا ۴۰ میلیون", min: 25_000_000, max: 40_000_000 },
    { id: "m4", label: "مهم نیست", min: 0, max: null },
  ],
  laptop: [
    { id: "l1", label: "تا ۲۵ میلیون", min: 0, max: 25_000_000 },
    { id: "l2", label: "۲۵ تا ۴۰ میلیون", min: 25_000_000, max: 40_000_000 },
    { id: "l3", label: "۴۰ تا ۶۰ میلیون", min: 40_000_000, max: 60_000_000 },
    { id: "l4", label: "مهم نیست", min: 0, max: null },
  ],
  accessory: [
    { id: "a1", label: "تا ۱ میلیون", min: 0, max: 1_000_000 },
    { id: "a2", label: "۱ تا ۲ میلیون", min: 1_000_000, max: 2_000_000 },
    { id: "a3", label: "بالاتر", min: 2_000_000, max: null },
    { id: "a4", label: "مهم نیست", min: 0, max: null },
  ],
  other: [],
};

export const PRIORITIES: Record<
  Category,
  { id: string; label: string; hint: string }[]
> = {
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

/* ------------------------------ products ------------------------------ */

export const PRODUCTS: Product[] = [
  {
    id: "note13pro",
    category: "mobile",
    tier: "budget",
    name: "شیائومی ردمی نوت ۱۳ پرو",
    shortName: "ردمی نوت ۱۳ پرو",
    specs: [
      { label: "دوربین اصلی", value: "۲۰۰ مگاپیکسل + OIS" },
      { label: "باتری", value: "۵۱۰۰ میلی‌آمپر، شارژ ۶۷W" },
      { label: "چیپست", value: "Helio G99 Ultra" },
      { label: "حافظه", value: "۲۵۶ گیگ | رم ۸" },
    ],
    bullets: [
      "دوربین ۲۰۰ مگاپیکسلی با لرزشگیر اپتیکال؛ توی این بازه‌ی قیمتی کمتر دیده می‌شه",
      "شارژ سریع ۶۷ واتی بین دو کلاس دانشگاه فولت می‌کنه",
      "خیلی زیر سقف بودجه‌ات می‌مونه؛ بقیه‌ش می‌شه هزینه‌ی قاب و گلس",
    ],
    tradeoffs: [
      "چیپستش برای بازی‌های سنگین میان‌رده است",
      "آپدیت‌های نرم‌افزاری طولانی‌مدتش محدودتر از سامسونگه",
    ],
    fitNote:
      "برای «عکاسی + دانشگاه» با بودجه‌ی محدود: قوی‌ترین سنسور دوربینِ این رنج قیمت، با باتری یک‌روزه.",
    keywords: ["camera", "battery", "both"],
  },
  {
    id: "a55",
    category: "mobile",
    tier: "balanced",
    name: "سامسونگ گلکسی A55",
    shortName: "گلکسی A55",
    specs: [
      { label: "دوربین اصلی", value: "۵۰ مگاپیکسل + OIS" },
      { label: "باتری", value: "۵۰۰۰ میلی‌آمپر، شارژ ۲۵W" },
      { label: "چیپست", value: "Exynos 1480" },
      { label: "بدنه", value: "فریم فلزی، IP67" },
    ],
    bullets: [
      "ترکیب متعادل دوربینِ باکیفیت + باتری یک‌روزه؛ دقیقا ترکیبِ «عکاسی و دانشگاه»",
      "ضدآب IP67 و فریم فلزی؛ برای ول خوردن توی کیف دانشجویی مهم‌تر از چیزیه که فکر می‌کنی",
      "۴ سال آپدیت اندروید؛ یعنی تا آخر دانشگاه قرار نیست عوضش کنی",
    ],
    tradeoffs: [
      "شارژ ۲۵ واتی از رقبای چینی کندتره",
      "شارژر داخل جعبه نیست؛ هزینه‌ش رو حساب کن",
    ],
    fitNote:
      "انتخاب «متعادل و مناسب نیاز»: دوربینِ مطمئن با OIS، بدنه‌ی مقاوم و پشتیبانی نرم‌افزاری طولانی — جمع همینا برای دانشجو مهمه.",
    keywords: ["camera", "both"],
  },
  {
    id: "p8a",
    category: "mobile",
    tier: "feature",
    name: "گوگل پیکسل ۸a",
    shortName: "پیکسل ۸a",
    specs: [
      { label: "دوربین اصلی", value: "۶۴ مگاپیکسل + پردازش هوش مصنوعی" },
      { label: "باتری", value: "۴۴۹۲ میلی‌آمپر" },
      { label: "چیپست", value: "Google Tensor G3" },
      { label: "ویژگی", value: "۷ سال آپدیت" },
    ],
    bullets: [
      "بهترین پردازش تصویر این لیست؛ عکس‌های شبانه و پرتره‌ات سر زبان‌ها میفته",
      "ابزارهای ویرایش عکس با هوش مصنوعی؛ برای پروژه‌های دانشگاهی کارسازه",
      "۷ سال آپدیت کامل — رکورد این لیست",
    ],
    tradeoffs: [
      "از سقف بودجه‌ات بالاتر می‌زنه؛ باید بودجه رو انعطاف‌پذیر کنی",
      "باتریش از A55 و نوت ۱۳ پرو کوچیک‌تره",
    ],
    fitNote:
      "«امکانات بیشتر»: اگه دوربین اولویت اولته و بتونی بودجه رو بالا ببری، بالاترین کیفیت عکس رو داره.",
    keywords: ["camera"],
  },
  {
    id: "ideapad3",
    category: "laptop",
    tier: "budget",
    name: "لنوو IdeaPad Slim 3",
    shortName: "IdeaPad Slim 3",
    specs: [
      { label: "پردازنده", value: "Core i3-N305" },
      { label: "وزن", value: "۱٫۶۲ کیلوگرم" },
      { label: "حافظه", value: "۲۵۶ گیگ SSD | رم ۸" },
      { label: "نمایشگر", value: "۱۵٫۶ اینچ FHD" },
    ],
    bullets: [
      "برای تایپ، وب و کلاس آنلاین کاملا جواب‌گوست",
      "سبک و باریک؛ توی کوله حس نمی‌شه",
      "خیلی داخل بودجه‌ی اول می‌مونه",
    ],
    tradeoffs: ["برای رندر یا کار گرافیکی سنگین ساخته نشده"],
    fitNote: "گزینه‌ی اقتصادی برای کارهای روزمره‌ی دانشگاه.",
    keywords: ["weight"],
  },
  {
    id: "vivobook15",
    category: "laptop",
    tier: "balanced",
    name: "ایسوس VivoBook 15 R1504",
    shortName: "VivoBook 15",
    specs: [
      { label: "پردازنده", value: "Core i5-1335U" },
      { label: "وزن", value: "۱٫۷ کیلوگرم" },
      { label: "حافظه", value: "۵۱۲ گیگ SSD | رم ۱۶" },
      { label: "نمایشگر", value: "۱۵٫۶ اینچ FHD مات" },
    ],
    bullets: [
      "رم ۱۶ گیگ؛ تب‌های زیاد + نرم‌افزارهای دانشگاهی همزمان بدون لگ",
      "نمایشگر مات زیر نور آمفی‌تاتر اذیت نمی‌کنه",
      "تعادل خوب وزن و قدرت",
    ],
    tradeoffs: ["باتری برای یک روز کامل کلاس شارژ ظهر می‌خواد"],
    fitNote: "انتخاب متعادل: قدرت کافی برای واحدهای عملی، وزن قابل‌حمل.",
    keywords: ["power", "weight", "both2"],
  },
  {
    id: "macairm2",
    category: "laptop",
    tier: "feature",
    name: "اپل مک‌بوک ایر M2",
    shortName: "مک‌بوک ایر M2",
    specs: [
      { label: "پردازنده", value: "Apple M2" },
      { label: "وزن", value: "۱٫۲۴ کیلوگرم" },
      { label: "حافظه", value: "۲۵۶ گیگ | رم ۸" },
      { label: "باتری", value: "تا ۱۸ ساعت" },
    ],
    bullets: [
      "سبک‌ترین لیست با بهترین باتری؛ از صبح تا شب بدون شارژر",
      "قدرت پردازش برای ادیت و پروژه‌های سنگین هم کافیه",
      "ارزش بازفروش بالا",
    ],
    tradeoffs: ["گرونه؛ رم ۸ پایه برای چندسال آینده مرزیه"],
    fitNote: "«امکانات بیشتر»: اگه سبکی + باتری اولویته و بودجه انعطاف داره.",
    keywords: ["weight", "power", "both2"],
  },
  {
    id: "buds4lite",
    category: "accessory",
    tier: "budget",
    name: "شیائومی Redmi Buds 4 Lite",
    shortName: "Buds 4 Lite",
    specs: [
      { label: "باتری", value: "تا ۲۰ ساعت با کیس" },
      { label: "اتصال", value: "بلوتوث ۵٫۳" },
      { label: "وزن هر ایرباد", value: "۳٫۹ گرم" },
    ],
    bullets: ["زیر بودجه می‌مونه و برای پادکست و کلاس کافیه"],
    tradeoffs: ["نویزکنسلینگ نداره؛ میکروفونش متوسطه"],
    fitNote: "اقتصادی و سرِ راه-class.",
    keywords: ["price"],
  },
  {
    id: "qcyarc",
    category: "accessory",
    tier: "balanced",
    name: "هندزفری QCY ArcBuds",
    shortName: "QCY ArcBuds",
    specs: [
      { label: "باتری", value: "تا ۳۲ ساعت با کیس" },
      { label: "ANC", value: "نویزکنسلینگ فعال" },
      { label: "اتصال", value: "بلوتوث ۵٫۳" },
    ],
    bullets: ["ANC واقعی توی این رنج قیمت پیدا کردنش سخته"],
    tradeoffs: ["کیفیت ساخت پلاستیکی‌تر از برندهای گرون‌تره"],
    fitNote: "متعادل: نویزکنسلینگ واقعی بدون خرج زیاد.",
    keywords: ["price", "brand"],
  },
  {
    id: "budsfe",
    category: "accessory",
    tier: "feature",
    name: "سامسونگ گلکسی Buds FE",
    shortName: "Galaxy Buds FE",
    specs: [
      { label: "باتری", value: "تا ۳۰ ساعت با کیس" },
      { label: "ANC", value: "نویزکنسلینگ فعال + Ambient" },
      { label: "ویژگی", value: "یکپارچگی با گلکسی" },
    ],
    bullets: ["با گوشی سامسونگ یکپارچه کار می‌کنه؛ ANC بالاترین سطح لیسته"],
    tradeoffs: ["قیمتش چند برابر گزینه‌های دیگه‌ست"],
    fitNote: "امکانات بیشتر: بهترین تجربه، بیشترین هزینه.",
    keywords: ["brand"],
  },
];

/* ------------------------------- stores -------------------------------
 * User anchor (demo): میدان ونک — map center.
 * distanceKm matches mapX/mapY geometry (scale ≈ 1 unit = 150 m).
 * lat/lng are fictional Tehran-ish coords ONLY for the demo map link.
 * --------------------------------------------------------------------- */

export const ANCHOR = { x: 50, y: 56, label: "میدان ونک", sub: "موقعیت فرضی تو (نمایشی)" };

export const STORES: Store[] = [
  {
    id: "mobilcity",
    name: "موبایل سیتی",
    mall: "مجتمع تجاری ولیعصر",
    floor: "طبقه‌ی ۱",
    street: "بزرگراه شهید چمران، روبه‌روی پارک",
    unit: undefined,
    neighborhood: "یوسف‌آباد",
    distanceKm: 6.2,
    mapX: 8,
    mapY: 22,
    geo: { lat: 35.7702, lng: 51.4001 },
    hours: { opens: "10:00", closes: "21:30" },
    installment: true,
    contact: null,
  },
  {
    id: "digipardazesh",
    name: "دیجی‌پردازش",
    mall: "پاساژ علاءالدین",
    floor: "طبقه‌ی ۲",
    unit: "واحد ۱۱۲",
    street: "خیابان جمهوری، بعد از چهارراه حافظ",
    neighborhood: "حافظ",
    distanceKm: 5.4,
    mapX: 86,
    mapY: 78,
    geo: { lat: 35.7022, lng: 51.4016 },
    hours: { opens: "10:00", closes: "20:30" },
    installment: false,
    contact: null,
  },
  {
    id: "mobiland",
    name: "فروشگاه تخصصی موبی‌لند",
    mall: "برج موبایل ونک",
    floor: "طبقه‌ی همکف",
    unit: "واحد ۳",
    street: "میدان ونک، خیابان ملاصدرا",
    neighborhood: "ونک",
    distanceKm: 0.4,
    mapX: 55,
    mapY: 60,
    geo: { lat: 35.7579, lng: 51.4098 },
    hours: { opens: "09:30", closes: "22:00", fridayNote: "جمعه‌ها ۱۴ تا ۲۱" },
    installment: true,
    contact: null,
  },
  {
    id: "mobilshahr",
    name: "موبایل شهر",
    mall: "پاساژ پایتخت",
    floor: "طبقه‌ی ۲",
    unit: "واحد ۲۱۴",
    street: "خیابان ولیعصر، بالاتر از میدان ونک",
    neighborhood: "ونک",
    distanceKm: 1.1,
    mapX: 62,
    mapY: 46,
    geo: { lat: 35.7624, lng: 51.4110 },
    hours: { opens: "10:00", closes: "21:30", fridayNote: "جمعه‌ها تعطیل" },
    installment: true,
    contact: null,
  },
  {
    id: "aval",
    name: "اول موبایل",
    street: "خیابان گاندھی، نبش کوچه‌ی ۱۲",
    neighborhood: "گاندھی",
    distanceKm: 1.8,
    mapX: 60,
    mapY: 30,
    geo: { lat: 35.7675, lng: 51.4105 },
    hours: null,
    installment: null,
    contact: null,
  },
  {
    id: "techgallery",
    name: "تک‌گالری",
    mall: "پاساژ ملک",
    floor: "طبقه‌ی ۱",
    unit: "واحد ۱۲",
    street: "خیابان ولیعصر، نرسیده به پارک ساعی",
    neighborhood: "عباس‌آباد",
    distanceKm: 2.3,
    mapX: 74,
    mapY: 52,
    geo: { lat: 35.7588, lng: 51.4202 },
    hours: { opens: "10:30", closes: "21:00" },
    installment: true,
    contact: null,
  },
  {
    id: "parsiangadget",
    name: "گجت‌استور پارسیان",
    street: "بلوار کشاورز، جنب پارک لاله",
    neighborhood: "لاله",
    distanceKm: 3.1,
    mapX: 80,
    mapY: 66,
    geo: { lat: 35.7161, lng: 51.4013 },
    hours: { opens: "11:00", closes: "20:00", fridayNote: "جمعه‌ها تعطیل" },
    installment: false,
    contact: null,
  },
];

/* ------------------------------- offers -------------------------------
 * One row per (store × product) the store actually lists.
 * NOTHING elsewhere in the UI overrides these prices — single source.
 * A55 story (demo): cheapest listing has a STALE price + unknown stock.
 * --------------------------------------------------------------------- */

const OFFER_SOURCE = "ثبت فروشگاه در ترب (نمایشی)";

export const OFFERS: Offer[] = [
  /* — گلکسی A55 (main demo path) — */
  { productId: "a55", storeId: "mobilcity", priceToman: 23_200_000, updatedMinAgo: 60 * 26, sourceNote: OFFER_SOURCE, stock: "unconfirmed" },
  { productId: "a55", storeId: "digipardazesh", priceToman: 23_500_000, updatedMinAgo: 60 * 24 * 4, sourceNote: OFFER_SOURCE, stock: "unknown" },
  { productId: "a55", storeId: "techgallery", priceToman: 23_700_000, updatedMinAgo: 60 * 26, sourceNote: OFFER_SOURCE, stock: "unconfirmed" },
  { productId: "a55", storeId: "mobilshahr", priceToman: 23_900_000, updatedMinAgo: 60 * 2, sourceNote: OFFER_SOURCE, stock: "confirmed" },
  { productId: "a55", storeId: "aval", priceToman: 24_100_000, updatedMinAgo: 60 * 3, sourceNote: OFFER_SOURCE, stock: "confirmed" },
  { productId: "a55", storeId: "mobiland", priceToman: 24_600_000, updatedMinAgo: 30, sourceNote: OFFER_SOURCE, stock: "confirmed" },

  /* — ردمی نوت ۱۳ پرو — */
  { productId: "note13pro", storeId: "mobilcity", priceToman: 16_800_000, updatedMinAgo: 60 * 20, sourceNote: OFFER_SOURCE, stock: "unconfirmed" },
  { productId: "note13pro", storeId: "digipardazesh", priceToman: 17_100_000, updatedMinAgo: 60 * 5, sourceNote: OFFER_SOURCE, stock: "confirmed" },
  { productId: "note13pro", storeId: "mobilshahr", priceToman: 17_200_000, updatedMinAgo: 60 * 5, sourceNote: OFFER_SOURCE, stock: "unconfirmed" },
  { productId: "note13pro", storeId: "mobiland", priceToman: 17_500_000, updatedMinAgo: 60 * 8, sourceNote: OFFER_SOURCE, stock: "confirmed" },
  { productId: "note13pro", storeId: "parsiangadget", priceToman: 17_900_000, updatedMinAgo: 60 * 30, sourceNote: OFFER_SOURCE, stock: "unknown" },

  /* — پیکسل ۸a — */
  { productId: "p8a", storeId: "techgallery", priceToman: 39_800_000, updatedMinAgo: 60 * 4, sourceNote: OFFER_SOURCE, stock: "confirmed" },
  { productId: "p8a", storeId: "parsiangadget", priceToman: 40_500_000, updatedMinAgo: 60 * 6, sourceNote: OFFER_SOURCE, stock: "unconfirmed" },
  { productId: "p8a", storeId: "aval", priceToman: 41_200_000, updatedMinAgo: 60 * 24 * 3, sourceNote: OFFER_SOURCE, stock: "unknown" },

  /* — لپ‌تاپ‌ها — */
  { productId: "ideapad3", storeId: "digipardazesh", priceToman: 21_900_000, updatedMinAgo: 60 * 7, sourceNote: OFFER_SOURCE, stock: "confirmed" },
  { productId: "ideapad3", storeId: "parsiangadget", priceToman: 22_400_000, updatedMinAgo: 60 * 12, sourceNote: OFFER_SOURCE, stock: "unconfirmed" },
  { productId: "ideapad3", storeId: "techgallery", priceToman: 22_800_000, updatedMinAgo: 60 * 50, sourceNote: OFFER_SOURCE, stock: "unknown" },

  { productId: "vivobook15", storeId: "digipardazesh", priceToman: 30_700_000, updatedMinAgo: 60 * 3, sourceNote: OFFER_SOURCE, stock: "confirmed" },
  { productId: "vivobook15", storeId: "parsiangadget", priceToman: 31_300_000, updatedMinAgo: 60 * 9, sourceNote: OFFER_SOURCE, stock: "unconfirmed" },
  { productId: "vivobook15", storeId: "mobilcity", priceToman: 31_900_000, updatedMinAgo: 60 * 28, sourceNote: OFFER_SOURCE, stock: "unknown" },

  { productId: "macairm2", storeId: "parsiangadget", priceToman: 61_800_000, updatedMinAgo: 60 * 2, sourceNote: OFFER_SOURCE, stock: "confirmed" },
  { productId: "macairm2", storeId: "digipardazesh", priceToman: 62_500_000, updatedMinAgo: 60 * 24 * 2, sourceNote: OFFER_SOURCE, stock: "unconfirmed" },

  /* — لوازم جانبی — */
  { productId: "buds4lite", storeId: "mobilcity", priceToman: 615_000, updatedMinAgo: 60 * 4, sourceNote: OFFER_SOURCE, stock: "confirmed" },
  { productId: "buds4lite", storeId: "mobilshahr", priceToman: 649_000, updatedMinAgo: 60 * 10, sourceNote: OFFER_SOURCE, stock: "unconfirmed" },

  { productId: "qcyarc", storeId: "mobilshahr", priceToman: 890_000, updatedMinAgo: 60 * 3, sourceNote: OFFER_SOURCE, stock: "confirmed" },
  { productId: "qcyarc", storeId: "mobilcity", priceToman: 935_000, updatedMinAgo: 60 * 30, sourceNote: OFFER_SOURCE, stock: "unconfirmed" },

  { productId: "budsfe", storeId: "mobiland", priceToman: 3_580_000, updatedMinAgo: 60 * 2, sourceNote: OFFER_SOURCE, stock: "confirmed" },
  { productId: "budsfe", storeId: "mobilshahr", priceToman: 3_640_000, updatedMinAgo: 60 * 8, sourceNote: OFFER_SOURCE, stock: "unknown" },
];

/* --------------------------- lookup helpers --------------------------- */

export const getProduct = (id: string | null) =>
  PRODUCTS.find((p) => p.id === id) ?? null;

export const getStore = (id: string | null) =>
  STORES.find((s) => s.id === id) ?? null;

export const offersFor = (productId: string | null) =>
  productId ? OFFERS.filter((o) => o.productId === productId) : [];

export const getOffer = (productId: string | null, storeId: string | null) =>
  OFFERS.find((o) => o.productId === productId && o.storeId === storeId) ?? null;

export const productsOfCategory = (c: Category | null) =>
  PRODUCTS.filter((p) => p.category === c);

export const minPriceOffer = (productId: string) => {
  const list = offersFor(productId);
  if (!list.length) return null;
  return [...list].sort((a, b) => a.priceToman - b.priceToman)[0];
};
