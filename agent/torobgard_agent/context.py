import json
from pathlib import Path
from typing import Any

from pydantic import BaseModel
from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncConnection

SYSTEM = (Path(__file__).parent / "prompts" / "system.fa.md").read_text()
KEEP_TURNS = 8  # past user turns sent verbatim; older ones are summarised by FAST_MODEL
SUMMARISE = "این گفتگوی خرید رو در حداکثر ۵ خط فارسی خلاصه کن: کالا، بودجه، اولویت، مغازه‌ها و تصمیم‌ها."


class TurnContext(BaseModel):
    """What the web knows: the consult requirements, where the shopper says they are, the journey stage."""

    req: dict[str, Any] | None = None
    anchor: dict[str, Any] | None = None  # e.g. {"venue_slug": …} or {"lat": …, "lng": …}
    stage: str | None = None


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


def build(history: list[dict], summary: str | None, profile: dict, ctx: TurnContext, venue: dict | None,
          user_text: str) -> list[dict]:
    """System prompt (never touched by user text), one context note, recent turns, then the new message."""
    note = {"profile": profile, **ctx.model_dump(exclude_none=True), "venue": venue, "summary": summary}
    note = {k: v for k, v in note.items() if v}
    msgs = [{"role": "system", "content": SYSTEM}]
    if note:
        note_text = json.dumps(note, ensure_ascii=False)
        msgs.append({"role": "system", "content": "زمینه‌ی این گفتگو:\n" + note_text})
    return [*msgs, *history, {"role": "user", "content": user_text}]


def summary_request(older: list[dict]) -> list[dict]:
    lines = "\n".join(f"{m['role']}: {m['content']}" for m in older)
    return [{"role": "system", "content": SUMMARISE}, {"role": "user", "content": lines}]

