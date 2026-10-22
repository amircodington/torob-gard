import asyncio
import json
import logging
import re
from collections.abc import AsyncIterator
from contextlib import asynccontextmanager
from dataclasses import asdict, dataclass, field
from time import monotonic
from uuid import UUID, uuid4

from pydantic import ValidationError
from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncConnection

from . import config
from .context import TurnContext, build, load_session, split, summary_request, venue_summary
from .contract import Answer, AskBlock, Block
from .db import engine
from .grounder import Violation, cited_ids, ground, prices
from .llm import ChatResult, LLMClient, ToolCall
from .tools.registry import TOOLS, ToolResult, run_tool, serialise

log = logging.getLogger(__name__)

FALLBACK = "نتونستم تأیید کنم…"
MAX_TOOL_CALLS, MAX_ASKS, MAX_OPTIONS = 4, 2, 4


STARTED = "دارم نیازت رو می‌فهمم…"
TOOL_STATUS = {
    "search_products": "دارم کالاها رو می‌گردم…",
    "search_shops": "دارم مغازه‌ها و قیمت‌ها رو می‌گردم…",
    "price_check": "دارم قیمت رو با بازار مقایسه می‌کنم…",
    "locate_shop": "دارم جای مغازه رو پیدا می‌کنم…",
    "plan_trip": "دارم مسیرت رو می‌چینم…",
    "remember": "دارم یادداشت می‌کنم…",
}


@dataclass
class Status:
    """Progress line, sent before grounding; never a claim about shops or prices."""

    text: str


@dataclass
class Token:
    text: str


@dataclass
class BlockEvent:
    block: Block


@dataclass
class Done:
    message_id: UUID
    receipt_ids: list[str]
    session_id: UUID


Event = Status | Token | BlockEvent | Done


@dataclass
class _Turn:
    """Everything one turn gathers on its way to the message row."""

    results: list[ToolResult] = field(default_factory=list)
    calls: list[dict] = field(default_factory=list)
    tokens_in: int = 0
    tokens_out: int = 0
    cost: float = 0.0

    async def chat(self, llm, messages, tools, model) -> ChatResult:
        r = await llm.chat(messages, tools, model)
        self.tokens_in, self.tokens_out, self.cost = (
            self.tokens_in + r.tokens_in, self.tokens_out + r.tokens_out, self.cost + r.cost)
        return r


@asynccontextmanager
async def _tx(conn: AsyncConnection | None):
    if conn is not None:
        yield conn  # caller owns the transaction (tests roll back)
        return
    async with engine().begin() as c:
        yield c


def _parse(raw: str | None) -> Answer | None:
    """The model's final JSON; tolerant of fences or a word before/after it."""
    raw = raw or ""
    try:
        return Answer.model_validate_json(raw[raw.find("{"): raw.rfind("}") + 1])
    except ValidationError:
        return None


def _trim(answer: Answer) -> Answer:
    kept, asks = [], 0
    for b in answer.blocks:
        if isinstance(b, AskBlock):
            if asks == MAX_ASKS:
                continue
            asks, b.options = asks + 1, b.options[:MAX_OPTIONS]
        kept.append(b)
    answer.blocks = kept
    return answer


async def _complete(
    llm: LLMClient, messages: list[dict], turn: _Turn, user_id: str,
) -> AsyncIterator[Status | str | None]:
    """Call the model, running its tool calls (≤ MAX_TOOL_CALLS a turn); yields statuses, then the reply."""
    while True:
        budget = MAX_TOOL_CALLS - len(turn.calls)
        r = await turn.chat(llm, messages, TOOLS if budget > 0 else None, config.AGENT_MODEL)
        if not r.tool_calls or budget <= 0:
            yield r.content
            return
        calls = r.tool_calls[:budget]
        if llm.supports_tools:
            messages.append({"role": "assistant", "content": r.content, "tool_calls": [
                {"id": c.id, "type": "function",
                 "function": {"name": c.name, "arguments": json.dumps(c.args, ensure_ascii=False)}}
                for c in calls]})
        else:
            messages.append({"role": "assistant", "content": r.content})
        for name in dict.fromkeys(c.name for c in calls):
            yield Status(TOOL_STATUS.get(name, "دارم می‌گردم…"))
        done = await asyncio.gather(*(_run(c, user_id) for c in calls))  # one step's calls are independent
        for c, (res, log_row) in zip(calls, done, strict=True):
            turn.results.append(res)
            turn.calls.append(log_row)
            if llm.supports_tools:
                messages.append({"role": "tool", "tool_call_id": c.id, "content": serialise(res)})
            else:
                messages.append({"role": "user", "content": f"نتیجه‌ی ابزار {c.name}:\n{serialise(res)}"})


async def _run(call: ToolCall, user_id: str) -> tuple[ToolResult, dict]:
    t0 = monotonic()
    res = await run_tool(call, user_id=user_id)  # tools use their own short connections
    err = res.data.get("error") if isinstance(res.data, dict) else None
    return res, ({
        "name": call.name, "args": call.args, "error": err, "duration_ms": int((monotonic() - t0) * 1000),
        "summary": {"ids": sorted(res.ids),
                    "count": len(res.data) if isinstance(res.data, list) else int(not err)}})


def _correction(violations: list[Violation]) -> dict:
    lines = "\n".join(f"- {v.message}" for v in violations)
    return {"role": "system", "content": "جوابت تأیید نشد:\n" + lines + "\nفقط از نتیجه‌ی ابزارهای همین نوبت"
            " استفاده کن (یا ابزار صدا بزن) و دوباره فقط JSON خروجی رو بده."}


def _chunks(s: str) -> list[str]:
    return re.findall(r"\S+\s*|\s+", s)


async def run_turn(
    session_id: UUID | None, text_in: str, context: TurnContext, *,
    llm: LLMClient | None = None, db: AsyncConnection | None = None,
) -> AsyncIterator[Event]:
    """One agent turn: context → LLM ⇄ tools → Answer → ground (retry once) → persist → events."""
    t0, llm, sid = monotonic(), llm or LLMClient(), session_id or uuid4()
    yield Status(STARTED)  # ARCHITECTURE §7: first event well under 2.5 s, before any DB or LLM work
    turn = _Turn()
    async with _tx(db) as conn:
        sctx, history = await load_session(conn, sid)
        venue = await venue_summary(conn, context.anchor)
    older, recent = split(history)
    summary = None
    if older:
        # ponytail: re-summarised every turn past 8; cache on session.context if FAST_MODEL cost shows up
        summary = (await turn.chat(llm, summary_request(older), None, config.FAST_MODEL)).content
    profile = sctx.get("profile", {})
    messages = build(recent, summary, profile, context, venue, text_in)

    # numbers the shopper typed (this turn or earlier) may come back only as a budget echo in `say`;
    # the profile is model-written, so it never grounds anything
    user_prices = {p for t in [text_in, *(m["content"] for m in history if m["role"] == "user")]
                   for p in prices(t)}
    violations: list[Violation] = []
    answer = None
    for _attempt in range(2):
        # ponytail: guests remember under the session id (R4); the real user id arrives with auth (P3)
        raw = None
        async for x in _complete(llm, messages, turn, str(sid)):
            if isinstance(x, Status):
                yield x
            else:
                raw = x
        answer = _parse(raw)
        found = ground(answer, turn.results, user_prices) if answer else [
            Violation("format", "", "reply was not the Answer JSON object")]
        violations += found
        if not found:
            break
        messages += [{"role": "assistant", "content": raw or ""}, _correction(found)]
        answer = None
    if answer is None:
        log.warning("grounding failed twice in session %s: %s", sid, violations)
        answer = Answer(say=FALLBACK)
    answer = _trim(answer)
    receipts = cited_ids(answer)
    profile = {**profile, **answer.profile_updates}
    latency = int((monotonic() - t0) * 1000)
    log.info("turn %s: %d+%d tokens, $%.5f, %d ms", sid, turn.tokens_in, turn.tokens_out, turn.cost, latency)

    message_id = uuid4()
    async with _tx(db) as conn:
        await conn.execute(text(
            "INSERT INTO conversation_session (id, context, model) VALUES (:s, CAST(:c AS jsonb), :m)"
            " ON CONFLICT (id) DO UPDATE SET context = EXCLUDED.context"),
            {"s": sid, "m": config.AGENT_MODEL,
             "c": json.dumps({**sctx, **context.model_dump(exclude_none=True), "profile": profile},
                             ensure_ascii=False)})
        # ponytail: two concurrent turns in one session collide on (session, seq); the web sends one at a time
        seq = (await conn.execute(text("SELECT coalesce(max(seq), 0) FROM conversation_message"
                                       " WHERE session_id = :s"), {"s": sid})).scalar()
        content = {**answer.model_dump(), "violations": [asdict(v) for v in violations]}
        rows = [
            {"i": uuid4(), "q": seq + 1, "r": "user", "c": {"text": text_in, "context": context.model_dump()},
             "rc": [], "ti": None, "to": None, "l": None},
            {"i": message_id, "q": seq + 2, "r": "assistant", "c": content, "rc": receipts,
             "ti": turn.tokens_in, "to": turn.tokens_out, "l": latency},
        ]
        await conn.execute(text(
            "INSERT INTO conversation_message (id, session_id, seq, role, content, receipt_ids, tokens_in,"
            " tokens_out, latency_ms) VALUES (:i, :s, :q, :r, CAST(:c AS jsonb), :rc, :ti, :to, :l)"),
            [{**r, "s": sid, "c": json.dumps(r["c"], ensure_ascii=False)} for r in rows])
        if turn.calls:
            await conn.execute(text(
                "INSERT INTO conversation_toolcall (id, message_id, name, args, result_summary, duration_ms,"
                " error) VALUES (gen_random_uuid(), :m, :n, CAST(:a AS jsonb), CAST(:r AS jsonb), :d, :e)"),
                [{"m": message_id, "n": c["name"], "a": json.dumps(c["args"], ensure_ascii=False),
                  "r": json.dumps(c["summary"]), "d": c["duration_ms"], "e": c["error"]} for c in turn.calls])

    # ponytail: say is streamed only after grounding passed (no ungrounded text reaches the user), so
    # "tokens" arrive in one burst; stream the say field live if first-token latency matters.
    for chunk in _chunks(answer.say):
        yield Token(chunk)
    for b in answer.blocks:
        yield BlockEvent(b)
    yield Done(message_id, receipts, sid)
