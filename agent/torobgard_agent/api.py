import json
import logging
import os
from functools import cache
from uuid import UUID

from fastapi import APIRouter, HTTPException
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
    # ponytail: fixed window keyed by session; a client that drops its session id escapes it — key by
    # user once auth lands (P3)
    n = await r.incr(f"rl:agent:{key}")
    if n == 1:
        await r.expire(f"rl:agent:{key}", WINDOW_S)
    return n <= TURNS


def _sse(event: str, data) -> str:
    return f"event: {event}\ndata: {json.dumps(data, ensure_ascii=False, default=str)}\n\n"


@router.post("/agent/chat")
async def chat(body: ChatIn):
    if body.session_id:
        try:
            if not await allow(redis(), str(body.session_id)):
                raise HTTPException(429, "too many turns, wait a few minutes")
        except RedisError:
            log.exception("rate limit unavailable; letting the turn through")

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
async def price_check_route(body: PriceCheckIn):
    """The store sheet's «این قیمت منصفانه‌ست؟»: the tool alone, no LLM."""
    return await price_check(body.product_id, body.quoted_price, None)


@router.post("/agent/explain")
async def explain_route(body: ExplainIn):
    """Desk copy by FAST_MODEL; a tier missing from the answer keeps its P1 template."""
    return await explain(body)
