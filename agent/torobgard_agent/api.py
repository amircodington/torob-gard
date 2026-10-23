import json
import logging
import os
from functools import cache
from uuid import UUID

from fastapi import APIRouter, HTTPException, Request
from fastapi.responses import StreamingResponse
from pydantic import BaseModel, Field
from redis.asyncio import Redis
from redis.exceptions import RedisError

from .context import TurnContext
from .explain import ExplainIn, explain
from .orchestrator import BlockEvent, Done, Status, Token, run_turn
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


async def _limit(client: str, session_id: UUID | None = None) -> None:
    """Per client always, and per session too: a fresh session id per request does not reset it."""
    try:
        ok = all([await allow(redis(), k) for k in (client, session_id) if k])
    except RedisError:
        log.exception("rate limit unavailable; letting the request through")
        return
    if not ok:
        raise HTTPException(429, "too many turns, wait a few minutes")


def _sse(event: str, data) -> str:
    return f"event: {event}\ndata: {json.dumps(data, ensure_ascii=False, default=str)}\n\n"


@router.post("/agent/chat")
async def chat(body: ChatIn, request: Request):
    await _limit(_client(request), body.session_id)

    async def events():
        try:
            async for e in run_turn(body.session_id, body.text, body.context):
                if isinstance(e, Status):
                    yield _sse("status", {"text": e.text})
                elif isinstance(e, Token):
                    yield _sse("token", {"text": e.text})
                elif isinstance(e, BlockEvent):
                    yield _sse("block", e.block.model_dump())
                elif isinstance(e, Done):
                    yield _sse("done", {"message_id": e.message_id, "receipt_ids": e.receipt_ids,
                                        "session_id": e.session_id})
        except Exception:  # the web falls back to the P1 reducer on this event
            log.exception("agent turn failed")
            yield _sse("error", {"message": "agent unavailable"})

    return StreamingResponse(events(), media_type="text/event-stream",
                             headers={"Cache-Control": "no-cache", "X-Accel-Buffering": "no"})


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
