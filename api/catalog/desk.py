"""Decision desk: three tiers from specs and prices (PLAN.md §5.1). No LLM in P1."""
import re
import statistics
from dataclasses import dataclass, field

from torobgard.persian import normalize, to_ascii_digits

from . import desk_config as C
from .models import Product

_NUM = re.compile(r"\d+(?:\.\d+)?")
_MISSING = float("-inf")  # sorts a missing spec below every real one (weight scores are negative)


def spec_number(specs: list[dict], keys: list[str]) -> float | None:
    # ponytail: units not converted (۱ ترابایت < ۵۱۲ گیگ); add a unit table if storage ranks wrong.
    by_key = {normalize(s.get("key")): s.get("value") or "" for s in reversed(specs)}
    for k in keys:
        m = _NUM.search(to_ascii_digits(str(by_key.get(normalize(k), ""))).replace("٫", "."))
        if m:
            return float(m.group())
    return None


def _kg(specs: list[dict]) -> float | None:
    kg = spec_number(specs, C.PRIORITY_SPECS["weight"])
    v = next((str(s.get("value")) for s in specs if normalize(s.get("key")) == "وزن"), "")
    return kg / 1000 if kg is not None and "گرم" in v and "کیلو" not in v else kg


@dataclass
class Tier:
    tier: str  # "budget" | "balanced" | "feature"
    product: Product
    price: int
    offer_count: int
    scores: dict[str, float | None] = field(default_factory=dict)
    over_max: int = 0  # toman above budget_max; feature tier only


def _normaliser(values: list[float | None]):
    real = [v for v in values if v is not None]
    lo, hi = (min(real), max(real)) if real else (0.0, 0.0)
    return lambda v: None if v is None else ((v - lo) / (hi - lo) if hi > lo else 1.0)


def _scores(category: str, priority: str | None, cands: list[Product]) -> list[dict]:
    raw = {k: [spec_number(p.specs, keys) for p in cands] for k, keys in C.FEATURE_SPECS.items()}
    norm = {k: list(map(_normaliser(v), v)) for k, v in raw.items()}
    out = []
    for i, p in enumerate(cands):
        have = [norm[k][i] for k in norm if norm[k][i] is not None]
        s: dict[str, float | None] = {"spec": sum(have) / len(have) if have else 0.0}
        # "missing" = the priority's own spec is absent (scored 0 / _MISSING);
        # the budget tier avoids those.
        s["missing"] = 0.0
        if category == "mobile" and priority in ("camera", "battery"):
            s["priority"] = raw[priority][i] or 0.0
            s["missing"] = float(raw[priority][i] is None)
        elif category == "mobile" and priority == "both":
            s["priority"] = ((norm["camera"][i] or 0) + (norm["battery"][i] or 0)) / 2
        elif category == "laptop" and priority == "weight":
            kg = _kg(p.specs)
            s["priority"] = _MISSING if kg is None else -kg
            s["missing"] = float(kg is None)
        elif category == "laptop" and priority == "power":
            s["priority"] = raw["ram"][i] or 0.0
            s["missing"] = float(raw["ram"][i] is None)
        elif category == "accessory" and priority == "price":
            s["priority"] = -float(p.min_price)
        elif category == "accessory" and priority == "brand":
            s["priority"] = float(p.offer_count)
        else:
            s["priority"] = None
        out.append(s)
    return out


def pick_tiers(
    category: str, budget_min: int, budget_max: int | None, priority: str | None
) -> list[Tier]:
    names = C.DESK_CATEGORIES.get(category)
    if not names:
        return []
    # ponytail: scores computed in Python over the category's candidates (≤ ~800), no SQL ranking.
    cands = list(
        Product.objects.filter(
            category__name__in=names, offer_count__gte=2, min_price__isnull=False
        )
        .only("id", "persian_title", "brand_name", "image_urls", "specs", "min_price",
              "offer_count")
        .order_by("id")
    )
    if not cands:
        return []
    rows = [
        Tier("", p, p.min_price, p.offer_count, s)
        for p, s in zip(cands, _scores(category, priority, cands), strict=True)
    ]
    hi = float("inf") if budget_max is None else budget_max
    band = [r for r in rows if budget_min <= r.price <= hi]
    if budget_max is not None:
        target, stretch = 0.75 * budget_max, 1.15 * budget_max
    else:
        prices = sorted(r.price for r in rows)
        target = statistics.median(r.price for r in band) if band else 0
        stretch = (
            statistics.quantiles(prices, n=10, method="inclusive")[-1]
            if len(prices) > 1 else prices[0]
        )

    picked: list[Tier] = []

    def take(name: str, pool: list[Tier], key) -> None:
        pool = [r for r in pool if all(r.product.id != t.product.id for t in picked)]
        if pool:
            best = min(pool, key=key)
            picked.append(Tier(name, best.product, best.price, best.offer_count, best.scores))

    # The cheapest that has the priority's spec; if none has it, the cheapest overall
    # (explain_tiers then adds «…: این مشخصه ثبت نشده»).
    with_spec = [r for r in band if not r.scores["missing"]]
    take("budget", with_spec or band, lambda r: (r.price, -r.offer_count))
    has_priority = any(r.scores["priority"] is not None for r in band)
    ranked = "priority" if has_priority else "spec"
    take("balanced", band, lambda r: (-r.scores[ranked], abs(r.price - target), -r.offer_count))
    take("feature", [r for r in rows if r.price <= stretch],
         lambda r: (-r.scores["spec"], r.price, -r.offer_count))
    if picked and picked[-1].tier == "feature" and budget_max is not None:
        picked[-1].over_max = max(0, picked[-1].price - budget_max)
    return picked


def explain_tiers(tiers: list[Tier], priority: str | None) -> dict[str, dict]:
    pscores = [t.scores.get("priority") for t in tiers]
    # a priority that does not apply to the category (phone + weight) gets no copy at all
    applies = any(s is not None for s in pscores)
    label = C.PRIORITY_LABEL.get(priority or "", "") if applies else ""
    keys = C.PRIORITY_SPECS.get(priority or "") if applies else None
    top = max((s for s in pscores if s is not None), default=None)
    cheapest = min((t.price for t in tiers), default=0)
    out = {}
    for t, ps in zip(tiers, pscores, strict=True):
        bullets, tradeoffs = [], []
        fits = top is not None and ps == top and ps != _MISSING
        if t.tier == "budget":
            bullets.append(C.T_CHEAPEST)
        elif t.tier == "balanced" and fits and priority in C.BALANCED_BULLET:
            bullets.append(C.BALANCED_BULLET[priority])
        elif t.tier == "feature":
            bullets.append(C.T_FEATURE)
        if priority == "weight":
            n = _kg(t.product.specs)
        else:
            n = spec_number(t.product.specs, keys) if keys else None
        if fits and len(tiers) > 1 and (n is not None or not keys):
            bullets.append(C.BEST_BULLET[priority].format(n=C.fa_num(n) if n is not None else ""))
        bullets.append(C.T_OFFERS.format(n=C.fa_num(t.offer_count)))
        if keys and n is None:
            tradeoffs.append(C.T_MISSING.format(label=label))
        elif ps is not None and not fits:
            tradeoffs.append(C.T_BEHIND.format(label=label))
        if t.tier != "budget" and t.price > cheapest:
            tradeoffs.append(C.T_PRICIER.format(x=C.fa_price(t.price - cheapest)))
        if t.over_max:
            tradeoffs.append(C.T_OVER_MAX.format(x=C.fa_price(t.over_max)))
        if t.tier == "balanced":
            fit_note = C.FIT["balanced"].format(label=label) if label else C.FIT_NO_PRIORITY
        else:
            fit_note = C.FIT[t.tier]
        out[t.tier] = {
            "bullets": bullets, "tradeoffs": tradeoffs, "fit_note": fit_note, "fits_priority": fits,
        }
    if 0 < len(tiers) < 3:
        out[tiers[0].tier]["fit_note"] += C.T_FEWER.format(n=C.fa_num(len(tiers)))
    return out
