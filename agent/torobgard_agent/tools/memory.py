from typing import Literal

from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncConnection

from ..db import engine

State = Literal["seen", "liked", "tried", "bought", "skipped"]


async def remember(
    user_id: str, product_id: str | None = None, shop_id: str | None = None, state: State = "seen",
    price_seen: int | None = None, note: str | None = None, *, db: AsyncConnection | None = None,
) -> dict:
    """Record that the user saw/liked/tried/bought/skipped a product or shop (Django owns the table)."""
    if not (product_id or shop_id):
        raise ValueError("remember needs a product_id or a shop_id")
    sql = text("""
        INSERT INTO conversation_itemmemory
            (id, user_id, product_id, shop_id, state, price_seen, note, created_at)
        VALUES (gen_random_uuid(), CAST(:u AS uuid), :p, :s, :st, :ps, :n, now())""")
    args = {"u": user_id, "p": product_id, "s": shop_id, "st": state, "ps": price_seen, "n": note}
    if db is not None:
        await db.execute(sql, args)  # caller owns the transaction
    else:
        async with engine().begin() as c:
            await c.execute(sql, args)
    return {"ok": True}
