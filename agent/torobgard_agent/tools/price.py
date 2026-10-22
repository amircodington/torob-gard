from datetime import UTC, datetime
from statistics import median
from typing import Literal, TypedDict

from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncConnection

from .search import ShopHit, _connect, search_shops

FAIR = 0.15  # within ±15% of the median is "fair"


class PriceCheck(TypedDict):
    product_id: str
    min: int | None
    median: int | None
    max: int | None
    offer_ids: list[str]
    verdict: Literal["below", "fair", "high", "unknown"]
    pct_vs_median: int | None
    cheaper_nearby: list[ShopHit]
    newest_price_at: datetime | None  # the honesty rule: every price shows its age
    newest_price_age_days: int | None


async def price_check(
    product_id: str, quoted_price: int | None, venue_slug: str | None, *, db: AsyncConnection | None = None,
) -> PriceCheck | dict:
    """Is the quoted price fair? Compares with the non-outlier offers; lists cheaper shops."""
    async with _connect(db) as conn:
        known = text("SELECT 1 FROM catalog_product WHERE id = :p")
        if not (await conn.execute(known, {"p": product_id})).first():
            return {"error": f"unknown product_id {product_id!r}: call search_products first and use its id"}
        rows = (await conn.execute(text(
            "SELECT id, price_toman, last_price_changed_at FROM catalog_offer"
            " WHERE product_id = :p AND NOT is_outlier"
            " ORDER BY price_toman, id"), {"p": product_id})).all()
        prices = [r[1] for r in rows]
        out: PriceCheck = {
            "product_id": product_id, "min": None, "median": None, "max": None,
            "offer_ids": [r[0] for r in rows], "verdict": "unknown", "pct_vs_median": None,
            "cheaper_nearby": [], "newest_price_at": max((r[2] for r in rows), default=None),
            "newest_price_age_days": None,
        }
        if out["newest_price_at"]:
            out["newest_price_age_days"] = (datetime.now(UTC) - out["newest_price_at"]).days
        if not prices:
            return out
        med = round(median(prices))
        out |= {"min": prices[0], "median": med, "max": prices[-1]}
        if quoted_price is None:
            return out
        ratio = (quoted_price - med) / med
        out["pct_vs_median"] = round(ratio * 100)
        out["verdict"] = "below" if ratio < -FAIR else "high" if ratio > FAIR else "fair"
        # ponytail: top 20 cheapest shops only; same-venue shops first, no distance ranking
        shops = await search_shops([product_id], None, None, None, 20, db=conn)
        cheaper = [s for s in shops if s["price"] is not None and s["price"] < quoted_price]
        out["cheaper_nearby"] = sorted(cheaper, key=lambda s: s["venue_slug"] != venue_slug)
    return out
