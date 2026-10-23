import hashlib
import hmac
import json
import logging
import os
import time
from functools import cache
from uuid import UUID

from fastapi import APIRouter, HTTPException, Request
from fastapi.responses import StreamingResponse
from pydantic import BaseModel, Field
from redis.asyncio import Redis
from redis.exceptions import RedisError
from sqlalchemy import text

from .context import TurnContext
from .db import engine
from .explain import ExplainIn, explain
from .orchestrator import BlockEvent, Done, Status, Token, run_turn
from .seller_notes import seller_notes
from .tools.price import price_check

log = logging.getLogger(__name__)
router = APIRouter()
TURNS, WINDOW_S = 30, 600  # ARCHITECTURE §8: 30 agent turns / 10 min


class ChatIn(BaseModel):
    session_id: UUID | None = None
    text: str = Field(min_length=1, max_length=1000)
    context: TurnContext = TurnContext()


@cache
def redis() -> Redis:
    return Redis.from_url(os.environ.get("REDIS_URL", "redis://localhost:6379/0"))


async def allow(r: Redis, key: str) -> bool:
    # ponytail: fixed window; a client can still send its own X-Forwarded-For (Next keeps it) until
    # prod nginx overwrites it (P3 deploy)
    n = await r.incr(f"rl:agent:{key}")
    if n == 1:
        await r.expire(f"rl:agent:{key}", WINDOW_S)
    return n <= TURNS


def _client(request: Request) -> str:
    """The shopper's address: the first X-Forwarded-For hop, else the socket peer."""
    # ponytail: Next 16's dev rewrite passes an incoming X-Forwarded-For through but adds none, so dev
    # falls back to the proxy's address (one bucket); prod nginx must set it to $remote_addr (P3 deploy)
    first = request.headers.get("x-forwarded-for", "").split(",")[0].strip()
    return first or (request.client.host if request.client else "anon")


async def _uid(request: Request) -> UUID | None:
    """The logged-in user from Django's `tg_uid` cookie (`uid.exp.sig`, api/people/api.py uid_token)."""
    key = os.environ.get("DJANGO_SECRET_KEY", "")
    parts = request.cookies.get("tg_uid", "").split(".")
    if not key or len(parts) != 3:
        return None
    uid, exp, sig = parts
    good = hmac.new(key.encode(), f"tg_uid:{uid}.{exp}".encode(), hashlib.sha256).hexdigest()
    try:  # bytes: a non-ASCII str makes compare_digest raise TypeError
        if not hmac.compare_digest(sig.encode(), good.encode()) or int(exp) < time.time():
            return None
        user = UUID(uid)
    except ValueError:
        return None
    # The cookie outlives «حذف داده‌هام» on another device; one indexed lookup per turn.
    async with engine().connect() as c:
        found = await c.execute(text("SELECT 1 FROM people_appuser WHERE id = :u"), {"u": user})
        return user if found.first() else None


async def _limit(client: str, session_id: UUID | None = None, user_id: UUID | None = None) -> None:
    """Per client always, per session and per user too: a fresh session id does not reset it."""
    try:
        ok = all([await allow(redis(), k) for k in (client, session_id, user_id) if k])
    except RedisError:
        log.exception("rate limit unavailable; letting the request through")
        return
    if not ok:
        raise HTTPException(429, "too many turns, wait a few minutes")


def _sse(event: str, data) -> str:
    return f"event: {event}\ndata: {json.dumps(data, ensure_ascii=False, default=str)}\n\n"


@router.post("/agent/chat")
async def chat(body: ChatIn, request: Request):
    uid = await _uid(request)
    await _limit(_client(request), body.session_id, uid)

    async def events():
        try:
            async for e in run_turn(body.session_id, body.text, body.context, user_id=uid):
                if isinstance(e, Status):
                    yield _sse("status", {"text": e.text})
                elif isinstance(e, Token):
                    yield _sse("token", {"text": e.text})
                elif isinstance(e, BlockEvent):
                    yield _sse("block", e.block.model_dump())
                elif isinstance(e, Done):
                    yield _sse("done", {"message_id": e.message_id, "receipt_ids": e.receipt_ids,
                                        "session_id": e.session_id, "need": e.need})
        except Exception:  # the web falls back to the P1 reducer on this event
            log.exception("agent turn failed")
            yield _sse("error", {"message": "agent unavailable"})

    return StreamingResponse(events(), media_type="text/event-stream",
                             headers={"Cache-Control": "no-cache, no-transform", "X-Accel-Buffering": "no"})


class PriceCheckIn(BaseModel):
    product_id: str = Field(min_length=1, max_length=64)
    quoted_price: int = Field(gt=0, lt=10**12)


@router.post("/agent/price_check")
async def price_check_route(body: PriceCheckIn, request: Request):
    """The store sheet's «این قیمت منصفانه‌ست؟»: the tool alone, no LLM."""
    await _limit(_client(request))
    return await price_check(body.product_id, body.quoted_price, None)


@router.post("/agent/explain")
async def explain_route(body: ExplainIn, request: Request):
    """Desk copy by FAST_MODEL; a tier missing from the answer keeps its P1 template."""
    await _limit(_client(request), body.session_id)
    return await explain(body)


class SellerNotesIn(BaseModel):
    product_id: str = Field(min_length=1, max_length=64)


NOTES_TTL_S = 86_400  # offers change daily at most (the dataset is a snapshot)


@router.post("/agent/seller_notes")
async def seller_notes_route(body: SellerNotesIn, request: Request):
    """The product page's «جمع‌بندی فروشنده‌ها»: one FAST_MODEL call per product per day."""
    key = f"notes:{body.product_id}"
    try:
        if hit := await redis().get(key):
            return json.loads(hit)
    except RedisError:
        log.exception("notes cache unavailable")
    await _limit(_client(request))
    out = await seller_notes(body.product_id)
    if out["points"]:  # a failed summary is retried on the next press
        try:
            await redis().set(key, json.dumps(out, ensure_ascii=False), ex=NOTES_TTL_S)
        except RedisError:
            log.exception("notes cache unavailable")
    return out
