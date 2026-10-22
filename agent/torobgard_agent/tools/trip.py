from typing import TypedDict

from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncConnection

from .search import _connect


class Stop(TypedDict):
    shop_id: str
    venue_slug: str | None
    floor: str | None
    unit: str | None
    seq: int


def _floor(f: str | None) -> tuple[int, int]:
    # ponytail: floors are text; non-numeric ones («همکف», «بالکن») sort after numbered floors
    try:
        return 0, int(f)  # type: ignore[arg-type]
    except (TypeError, ValueError):
        return 1, 0


async def plan_trip(shop_ids: list[str], *, db: AsyncConnection | None = None) -> list[Stop]:
    """Order stops venue by venue, floor ascending, so the shopper walks each building once."""
    async with _connect(db) as conn:
        rows = (await conn.execute(text("""
            SELECT s.id AS shop_id, v.slug AS venue_slug, s.floor, s.unit
            FROM catalog_shop s LEFT JOIN catalog_venue v ON v.id = s.venue_id
            WHERE s.id = ANY(:ids)"""), {"ids": shop_ids})).mappings().all()
    rows = sorted(rows, key=lambda r: (
        r["venue_slug"] is None, r["venue_slug"] or "", _floor(r["floor"]), r["shop_id"]))
    return [Stop(**r, seq=n) for n, r in enumerate(rows, 1)]
