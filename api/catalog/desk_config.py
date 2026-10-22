"""Decision desk tables and Persian templates (PLAN.md §4, §5.1)."""
import math

from torobgard.persian import to_fa_digits

DESK_CATEGORIES: dict[str, list[str]] = {
    "mobile": ["گوشی موبایل"],
    "laptop": ["لپ تاپ و نوت بوک"],
    "accessory": [
        "هدفون، هدست و هندزفری", "شارژر گوشی", "کیف و کاور گوشی", "محافظ صفحه نمایش گوشی",
    ],
}

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

# Shown on the card; None = first three specs as given.
TOP_SPECS: dict[str, list[str] | None] = {
    "mobile": ["حافظه داخلی", "مقدار RAM", "ظرفیت باتری", "دوربین اصلی", "اندازه صفحه نمایش"],
    "laptop": ["مدل پردازنده", "مقدار RAM", "حافظه RAM", "وزن", "اندازه صفحه نمایش"],
    "accessory": None,
}

PRIORITY_LABEL = {
    "camera": "دوربین", "battery": "باتری", "both": "دوربین و باتری", "weight": "وزن کم",
    "power": "قدرت", "price": "قیمت", "brand": "برند",
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
