import json
from pathlib import Path
from typing import Any

from pydantic import BaseModel, Field, field_validator
from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncConnection

SYSTEM = (Path(__file__).parent / "prompts" / "system.fa.md").read_text()
KEEP_TURNS = 8  # past user turns sent verbatim; older ones are summarised by FAST_MODEL
SUMMARISE = "این گفتگوی خرید رو در حداکثر ۵ خط فارسی خلاصه کن: کالا، بودجه، اولویت، مغازه‌ها و تصمیم‌ها."


class TurnContext(BaseModel):
    """What the web knows: the consult requirements, where the shopper says they are, the journey stage."""

    req: dict[str, Any] | None = None
    anchor: dict[str, Any] | None = None  # e.g. {"venue_slug": …} or {"lat": …, "lng": …}
    stage: str | None = Field(None, max_length=40)
    product_id: str | None = Field(None, max_length=64)  # the product page's chat: the product on screen

    @field_validator("req", "anchor")
    @classmethod
    def _small(cls, v: dict | None) -> dict | None:  # re-sent on every LLM call of the turn
        if v is not None and len(json.dumps(v, ensure_ascii=False)) > 1000:
            raise ValueError("too large")
        return v


async def load_session(conn: AsyncConnection, session_id) -> tuple[dict, list[dict]]:
    """(session.context, past user/assistant messages as chat messages, oldest first)."""
    row = (await conn.execute(text("SELECT context FROM conversation_session WHERE id = :s"),
                              {"s": session_id})).first()
    rows = (await conn.execute(text(
        "SELECT role, content FROM conversation_message WHERE session_id = :s"
        " AND role IN ('user', 'assistant') ORDER BY seq"), {"s": session_id})).all()
    history = [
        {"role": r, "content": c["text"] if r == "user" else json.dumps(
            {k: c.get(k) for k in ("say", "blocks") if c.get(k)}, ensure_ascii=False)}
        for r, c in rows
    ]
    return (row[0] if row else {}), history


def split(history: list[dict]) -> tuple[list[dict], list[dict]]:
    """(older, recent): recent starts at the KEEP_TURNS-th last user message."""
    users = [i for i, m in enumerate(history) if m["role"] == "user"]
    cut = users[-KEEP_TURNS] if len(users) > KEEP_TURNS else 0
    return history[:cut], history[cut:]


async def venue_summary(conn: AsyncConnection, anchor: dict | None) -> dict | None:
    slug = (anchor or {}).get("venue_slug")
    if not slug:
        return None
    row = (await conn.execute(text("SELECT name, shop_count, floors FROM catalog_venue WHERE slug = :s"),
                              {"s": slug})).first()
    return row and {"slug": slug, "name": f"<data>{row[0]}</data>", "shop_count": row[1], "floors": row[2]}


async def product_result(conn: AsyncConnection, product_id: str | None):
    """The product on screen as a tool result: its ids and prices ground the answer like a search's would."""
    from .tools.price import price_check
    from .tools.registry import ToolResult, _ids

    q = text("SELECT persian_title, brand_name, specs FROM catalog_product WHERE id = :p")
    row = product_id and (await conn.execute(q, {"p": product_id})).first()
    if not row:
        return None
    prices = await price_check(product_id, None, None, db=conn)
    data = {"product_id": product_id, "title": row[0], "brand": row[1],
            "specs": [{"key": s.get("key"), "value": s.get("value")} for s in row[2][:12]],
            **{k: prices[k] for k in ("min", "median", "max", "newest_price_age_days")},
            "offer_count": len(prices["offer_ids"])}
    return ToolResult("product", data, _ids(data), {"product_id": product_id})


def build(history: list[dict], summary: str | None, profile: dict, ctx: TurnContext, venue: dict | None,
          user_text: str, product: dict | None = None) -> list[dict]:
    """System prompt (never touched by user text), one context note, recent turns, then the new message."""
    note = {"profile": profile, **ctx.model_dump(exclude_none=True), "venue": venue, "product": product,
            "summary": summary}
    note = {k: v for k, v in note.items() if v}
    msgs = [{"role": "system", "content": SYSTEM}]
    if note:
        note_text = json.dumps(note, ensure_ascii=False)
        msgs.append({"role": "system", "content": "زمینه‌ی این گفتگو:\n" + note_text})
    return [*msgs, *history, {"role": "user", "content": user_text}]


def summary_request(older: list[dict]) -> list[dict]:
    lines = "\n".join(f"{m['role']}: {m['content']}" for m in older)
    return [{"role": "system", "content": SUMMARISE}, {"role": "user", "content": lines}]

