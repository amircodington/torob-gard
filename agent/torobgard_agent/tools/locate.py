from typing import TypedDict

from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncConnection

from .search import _connect


class Location(TypedDict):
    shop_id: str
    venue_name: str | None
    venue_slug: str | None
    floor: str | None
    unit: str | None
    hint: str | None
    confidence: float


async def locate_shop(shop_id: str, *, db: AsyncConnection | None = None) -> Location | None:
    """Where inside its venue a shop is (floor, unit, hint) and how sure the address parse was."""
    async with _connect(db) as conn:
        r = (await conn.execute(text("""
            SELECT s.id AS shop_id, v.name AS venue_name, v.slug AS venue_slug, s.floor, s.unit,
                s.location_hint AS hint, s.parse_confidence AS confidence
            FROM catalog_shop s LEFT JOIN catalog_venue v ON v.id = s.venue_id WHERE s.id = :id"""),
            {"id": shop_id})).mappings().first()
    return Location(**r) if r else None
