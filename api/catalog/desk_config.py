"""Decision desk tables and Persian templates (PLAN.md §4, §5.1)."""
import math

from torobgard.persian import to_fa_digits

DESK_CATEGORIES: dict[str, list[str]] = {
    "mobile": ["گوشی موبایل"],
    "laptop": ["لپ تاپ و نوت بوک"],
    "accessory": ["شارژر گوشی", "کیف و کاور گوشی", "محافظ صفحه نمایش گوشی"],
    "tablet": ["تبلت"],
    "tv": ["تلویزیون"],
    "powerbank": ["پاوربانک و شارژر همراه"],
    "photo": ["دوربین عکاسی و فیلمبرداری"],
    "headphone": ["هدفون، هدست و هندزفری"],
}

# Priorities the consult offers per category (web/src/config/journey.ts PRIORITIES mirrors them).
DESK_PRIORITIES: dict[str, list[str]] = {
    "mobile": ["camera", "battery", "both"],
    "laptop": ["weight", "power"],
    "accessory": ["price", "brand"],
    "tablet": ["screen", "battery", "storage"],
    "tv": ["size", "quality"],
    "powerbank": ["capacity", "fast", "light"],
    "photo": ["resolution", "speed", "light"],
    "headphone": ["playtime", "anc", "price"],
}
# Scored by hand in desk._scores (not one spec): mobile both, laptop weight (kg), price, brand.
SPECIAL_PRIORITIES = {"both", "weight", "price", "brand"}

PRIORITY_SPECS: dict[str, list[str]] = {
    "camera": ["دوربین اصلی", "مشخصات دوربین اصلی", "دوربین"],
    "battery": ["ظرفیت باتری"],
    "weight": ["وزن"],
    "power": ["مقدار RAM", "حافظه RAM"],
}

# Feature-tier spec score: mean of these, each normalised 0–1 within candidates.
FEATURE_SPECS: dict[str, list[str]] = {
    "ram": PRIORITY_SPECS["power"],
    "storage": ["حافظه داخلی"],
    "battery": PRIORITY_SPECS["battery"],
    "camera": PRIORITY_SPECS["camera"],
}

# Spec keys, in preference order, plus how desk.spec_value reads them:
# None = first number, "max" = largest number, "mp" = megapixels (W × H or «… مگاپیکسل»),
# "g" = grams (kilograms converted), "h" = playback hours (≤ 100),
# "anc" = 1 active noise cancelling / 0 not.
Spec = tuple[list[str], str | None]
SCREEN: Spec = (["اندازه صفحه نمایش", "سایز"], None)
POWERBANK_CAPACITY: Spec = (["ظرفیت اسمی", "ظرفیت", "ظرفیت باتری"], None)
POWERBANK_OUTPUT: Spec = (["توان خروجی کلی", "توان خروجی"], "max")
GRAMS: Spec = (["وزن"], "g")
PHOTO_MP: Spec = (["حداکثر رزولوشن"], "mp")
PHOTO_BURST: Spec = (["سرعت عکاسی پیاپی"], None)
PLAYTIME: Spec = (["عمر باتری هدفون در حالت پخش موسیقی"], "h")
ANC: Spec = (["قابلیت نویز کنسلینگ"], "anc")

# Feature-tier spec score per category (FEATURE_SPECS above for mobile, laptop and accessory).
CATEGORY_FEATURES: dict[str, dict[str, Spec]] = {
    "tablet": {"storage": (["حافظه داخلی"], None), "battery": (["ظرفیت باتری"], None),
               "screen": SCREEN},
    "tv": {"size": SCREEN, "quality": (["رزولوشن"], "max")},
    "powerbank": {"capacity": POWERBANK_CAPACITY, "fast": POWERBANK_OUTPUT},
    "photo": {"resolution": PHOTO_MP, "focus": (["تعداد نقاط فوکوس"], None), "speed": PHOTO_BURST},
    "headphone": {"playtime": PLAYTIME, "anc": ANC, "driver": (["قطر درایور"], None)},
}

# (category, priority) → (spec, higher is better). Everything not in SPECIAL_PRIORITIES.
PRIORITY_RULES: dict[tuple[str, str], tuple[Spec, bool]] = {
    ("mobile", "camera"): ((PRIORITY_SPECS["camera"], None), True),
    ("mobile", "battery"): ((PRIORITY_SPECS["battery"], None), True),
    ("laptop", "power"): ((PRIORITY_SPECS["power"], None), True),
    ("tablet", "screen"): (SCREEN, True),
    ("tablet", "battery"): ((["ظرفیت باتری"], None), True),
    ("tablet", "storage"): ((["حافظه داخلی"], None), True),
    ("tv", "size"): (SCREEN, True),
    ("tv", "quality"): ((["رزولوشن"], "max"), True),
    ("powerbank", "capacity"): (POWERBANK_CAPACITY, True),
    ("powerbank", "fast"): (POWERBANK_OUTPUT, True),
    ("powerbank", "light"): (GRAMS, False),
    ("photo", "resolution"): (PHOTO_MP, True),
    ("photo", "speed"): (PHOTO_BURST, True),
    ("photo", "light"): (GRAMS, False),
    ("headphone", "playtime"): (PLAYTIME, True),
    ("headphone", "anc"): (ANC, True),
}

# Shown on the card; None = first three specs as given.
TOP_SPECS: dict[str, list[str] | None] = {
    "mobile": ["حافظه داخلی", "مقدار RAM", "ظرفیت باتری", "دوربین اصلی", "اندازه صفحه نمایش"],
    "laptop": ["مدل پردازنده", "مقدار RAM", "حافظه RAM", "وزن", "اندازه صفحه نمایش"],
    "accessory": None,
    "tablet": ["اندازه صفحه نمایش", "حافظه داخلی", "ظرفیت باتری", "سیستم عامل"],
    "tv": ["اندازه صفحه نمایش", "سایز", "کیفیت تصویر", "نوع پنل", "سیستم عامل"],
    "powerbank": ["ظرفیت اسمی", "ظرفیت", "توان خروجی کلی", "توان خروجی", "وزن"],
    "photo": ["حداکثر رزولوشن", "نوع حسگر", "سرعت عکاسی پیاپی", "وزن"],
    "headphone": ["نوع اتصال", "قابلیت نویز کنسلینگ", "عمر باتری هدفون در حالت پخش موسیقی", "وزن"],
}

PRIORITY_LABEL = {
    "camera": "دوربین", "battery": "باتری", "both": "دوربین و باتری", "weight": "وزن کم",
    "power": "قدرت", "price": "قیمت", "brand": "برند",
    "screen": "اندازه صفحه", "storage": "حافظه", "size": "اندازه صفحه", "quality": "کیفیت تصویر",
    "capacity": "ظرفیت", "fast": "سرعت شارژ", "light": "وزن", "resolution": "رزولوشن",
    "speed": "سرعت عکاسی", "playtime": "زمان پخش", "anc": "نویز کنسلینگ",
}

# Bullet for the tier that wins its priority among the three; {n} = the spec number.
BEST_BULLET = {
    "camera": "دوربین {n} مگاپیکسل؛ بهترین بین این سه",
    "battery": "باتری {n} میلی‌آمپر؛ بیشترین بین این سه",
    "weight": "{n} کیلوگرم؛ سبک‌ترین بین این سه",
    "power": "رم {n} گیگابایت؛ بیشترین بین این سه",
    "both": "دوربین و باتری‌ش روی هم بهترینه",
    "price": "قیمتش از همه پایین‌تره",
    "brand": "بیشترین فروشنده رو داره",
    "screen": "صفحه‌ی {n} اینچ؛ بزرگ‌ترین بین این سه",
    "storage": "حافظه‌ی {n} گیگابایت؛ بیشترین بین این سه",
    "size": "صفحه‌ی {n} اینچ؛ بزرگ‌ترین بین این سه",
    "quality": "رزولوشن {n} پیکسل؛ بالاترین بین این سه",
    "capacity": "ظرفیت {n} میلی‌آمپر؛ بیشترین بین این سه",
    "fast": "خروجی {n} وات؛ سریع‌ترین شارژ بین این سه",
    "light": "{n} گرم؛ سبک‌ترین بین این سه",
    "resolution": "{n} مگاپیکسل؛ بیشترین بین این سه",
    "speed": "{n} فریم در ثانیه؛ سریع‌ترین بین این سه",
    "playtime": "{n} ساعت پخش؛ بیشترین بین این سه",
    "anc": "نویز کنسلینگ فعال داره",
}

T_CHEAPEST = "ارزون‌ترین گزینه‌ی تو بودجه‌ات"
# Budget tier when cheaper models in the band lack the priority's spec (they were skipped).
T_CHEAPEST_WITH_SPEC = "ارزون‌ترین مدلی که {label} ثبت‌شده داره"
T_SKIPPED = "{n} مدل ارزون‌تر هست که این مشخصه رو ثبت نکرده"
FIT_BUDGET_WITH_SPEC = "اگه قیمت مهمه ولی {label} ثبت‌شده هم می‌خوای، این رو ببین."
# Balanced tier, only when it really wins its priority among the three.
BALANCED_BULLET = {
    "camera": "بهترین دوربین تو این بودجه",
    "battery": "بیشترین باتری تو این بودجه",
    "weight": "سبک‌ترین تو این بودجه",
    "power": "بیشترین رم تو این بودجه",
    "both": "بهترین دوربین و باتری تو این بودجه",
    "screen": "بزرگ‌ترین صفحه تو این بودجه",
    "storage": "بیشترین حافظه تو این بودجه",
    "size": "بزرگ‌ترین صفحه تو این بودجه",
    "quality": "بالاترین کیفیت تصویر تو این بودجه",
    "capacity": "بیشترین ظرفیت تو این بودجه",
    "fast": "سریع‌ترین شارژ تو این بودجه",
    "light": "سبک‌ترین تو این بودجه",
    "resolution": "بیشترین مگاپیکسل تو این بودجه",
    "speed": "سریع‌ترین عکاسی پیاپی تو این بودجه",
    "playtime": "بیشترین زمان پخش تو این بودجه",
    "anc": "نویز کنسلینگ فعال، تو این بودجه",
}
T_FEATURE = "بیشترین امکانات بین این سه"
T_OFFERS = "{n} فروشنده تو بازار دارنش"
T_OVER_MAX = "{x} از سقف بودجه‌ات بالاتره"
T_MISSING = "{label}: این مشخصه ثبت نشده"
T_BEHIND = "از نظر {label} از بقیه عقب‌تره"
T_PRICIER = "{x} گرون‌تر از گزینه‌ی اقتصادی"
FIT = {
    "budget": "اگه قیمت برات از همه مهم‌تره، این رو ببین.",
    "balanced": "پیشنهاد ترب‌گرد: بین قیمت و {label} تعادل خوبی داره.",
    "feature": "اگه می‌خوای یه کم بیشتر بدی و امکانات بیشتری بگیری.",
}
FIT_NO_PRIORITY = "پیشنهاد ترب‌گرد: بین قیمت و امکانات تعادل خوبی داره."
T_FEWER = " تو این بازه فقط {n} گزینه با دست‌کم دو فروشنده پیدا کردیم."


def fa_num(n: float) -> str:
    return to_fa_digits(f"{n:g}").replace(".", "٫")


def fa_price(toman: int) -> str:
    """23_500_000 → «۲۳٫۵ میلیون تومان»; mirrors web/src/lib/fa.ts faPrice."""
    if toman >= 1_000_000:
        tidy = math.floor(toman / 100_000 + 0.5) / 10  # JS Math.round, not banker's rounding
        if tidy < 100:
            return f"{fa_num(tidy)} میلیون تومان"
    return f"{to_fa_digits(f'{toman:,}').replace(',', '٬')} تومان"
