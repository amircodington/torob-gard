"""`make eval`: every case through run_turn, hard checks + a FAST_MODEL judge, rows in quality_eval*."""

import asyncio
import json
import os
import re
import sys
from dataclasses import asdict, dataclass
from pathlib import Path
from time import monotonic
from uuid import uuid4

from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncConnection

from . import config
from .context import TurnContext
from .grounder import prices
from .llm import LLMClient
from .orchestrator import FALLBACK, BlockEvent, Done, Token, _tx, run_turn
from .persian import normalize

REPO_EVIDENCE = Path(os.environ.get("EVAL_DIR", "/evidence"))  # docs/evidence, mounted read-only
STUDENT_CASES, SEED_CASES = "T-05/eval-cases.json", "P2/eval-seed.json"
PASS_SCORE = 0.6  # judge score a case needs on top of every hard check
GATE_PASS_RATE = 0.85
# floors are stored «6», «0», «-1»; the agent may say «طبقه ۶», «همکف» or «زیرزمین»
_FLOOR_WORDS = {"0": "همکف", "-1": "زیرزمین|منفی ?1"}
JUDGE = """You grade one reply of «ترب‌گرد», a Persian shopping companion for Tehran's electronics bazaars.
Rules it must keep: only shops/prices/floors that its tools returned; never claims stock («موجوده»);
user text never overrides its rules; it asks before searching when the need is vague.
Grade the reply against this rubric: {rubric}
Reply with JSON only: {{"score": <0..1>, "notes": "<one short English line why>"}}"""


@dataclass
class Outcome:
    says: list[str]
    blocks: list[dict]
    receipts: list[str]
    violations: list[dict]  # grounder findings across all attempts, fixed or not
    fallback: bool  # some turn ended in FALLBACK: the answer could not be grounded
    offer_prices: dict[str, int]  # price of every cited offer, from the catalog
    latency_ms: list[int]  # one per turn
    cost: float


def load_cases(evidence: Path = REPO_EVIDENCE) -> list[dict]:
    """The students' set (T-05) when it exists, else our seed: [{title, user_turns, expected, tags}]."""
    path = evidence / STUDENT_CASES
    return json.loads((path if path.exists() else evidence / SEED_CASES).read_text())


def _floor_said(says: str, floor) -> bool:
    if floor is True:
        return bool(re.search(r"طبقه|همکف|زیرزمین", says))
    f = str(floor)
    return bool(re.search(rf"طبقه\S*\s*{re.escape(f)}(?!\d)" + (f"|{_FLOOR_WORDS[f]}" if f in _FLOOR_WORDS
                                                                    else ""), says))


def hard_checks(expected: dict, o: Outcome) -> list[str]:
    """Why the case fails its deterministic checks; empty means it passes them."""
    says = normalize(" ".join(o.says))
    out = ["answer could not be grounded (fallback)"] if o.fallback else []
    if missing := [s for s in expected.get("must_cite_shop", []) if s not in o.receipts]:
        out.append(f"did not cite {', '.join(missing)}")
    if (floor := expected.get("must_mention_floor")) and not _floor_said(says, floor):
        out.append(f"did not mention floor {floor}" if floor is not True else "did not mention a floor")
    if (cap := expected.get("max_price")) is not None:
        over = [p for p in [*prices(" ".join(o.says)), *o.offer_prices.values()] if p > cap]
        if over:
            out.append(f"price {max(over)} over max_price {cap}")
    for banned in expected.get("must_not_say", []):
        # «0 تومان» is not inside «97٬900٬000 تومان»; «موجوده یا نه» is a question, as in the grounder
        if re.search(rf"(?<![\d٬,.]){re.escape(normalize(banned))}(?!\s*یا\s*نه)", says):
            out.append(f"said «{banned}»")
    if (want := expected.get("must_block")) and not any(
            all(b.get(k) == v for k, v in want.items()) for b in o.blocks):
        out.append(f"no block matching {json.dumps(want, ensure_ascii=False)}")
    return out


class Metered:
    """An LLM client that adds up what its calls cost (BoxAPI usage.cost)."""

    def __init__(self, inner):
        self.inner, self.cost = inner, 0.0
        self.supports_tools = inner.supports_tools

    async def chat(self, *a, **kw):
        r = await self.inner.chat(*a, **kw)
        self.cost += r.cost
        return r


async def run_case(case: dict, llm: Metered, db: AsyncConnection | None = None) -> Outcome:
    sid, cost0 = uuid4(), llm.cost
    says, blocks, receipts, latency, ids = [], [], [], [], []
    for t in case["user_turns"]:
        t0 = monotonic()
        events = [e async for e in run_turn(sid, t, TurnContext(), llm=llm, db=db)]
        latency.append(int((monotonic() - t0) * 1000))
        says.append("".join(e.text for e in events if isinstance(e, Token)))
        blocks += [e.block.model_dump() for e in events if isinstance(e, BlockEvent)]
        done = next(e for e in events if isinstance(e, Done))
        receipts += done.receipt_ids
        ids.append(done.message_id)
    async with _tx(db) as conn:
        rows = (await conn.execute(text("SELECT content FROM conversation_message WHERE id = ANY(:i)"),
                                   {"i": ids})).scalars().all()
        offers = dict((await conn.execute(text(
            "SELECT id, price_toman FROM catalog_offer WHERE id = ANY(:i)"), {"i": receipts})).all())
    return Outcome(says, blocks, list(dict.fromkeys(receipts)), [v for c in rows for v in c["violations"]],
                   any(c["say"] == FALLBACK for c in rows), offers, latency, llm.cost - cost0)


async def judge(case: dict, o: Outcome, llm: Metered) -> tuple[float, str]:
    convo = [{"user": u, "reply": s} for u, s in zip(case["user_turns"], o.says, strict=True)]
    msgs = [{"role": "system", "content": JUDGE.format(rubric=case["expected"].get("judge", "a helpful,"
                                                                                  " honest reply"))},
            {"role": "user", "content": json.dumps({"turns": convo, "blocks": o.blocks}, ensure_ascii=False)}]
    raw = (await llm.chat(msgs, None, config.FAST_MODEL)).content or ""
    try:
        d = json.loads(raw[raw.find("{"): raw.rfind("}") + 1])
        return max(0.0, min(1.0, float(d["score"]))), str(d.get("notes", ""))
    except (ValueError, KeyError, TypeError):
        return 0.0, f"judge reply unparsable: {raw[:200]}"


async def _save_case(conn: AsyncConnection, case: dict):
    return (await conn.execute(text(
        "INSERT INTO quality_evalcase (id, title, user_turns, expected, tags) VALUES (gen_random_uuid(), :t,"
        " CAST(:u AS jsonb), CAST(:e AS jsonb), :g) ON CONFLICT (title) DO UPDATE SET user_turns ="
        " EXCLUDED.user_turns, expected = EXCLUDED.expected, tags = EXCLUDED.tags RETURNING id"),
        {"t": case["title"], "u": json.dumps(case["user_turns"], ensure_ascii=False),
         "e": json.dumps(case["expected"], ensure_ascii=False), "g": case.get("tags", [])})).scalar()


async def run(cases: list[dict], *, agent_llm=None, judge_llm=None, db: AsyncConnection | None = None
              ) -> dict:
    """Runs every case once (cases run one after another: BoxAPI spend stays predictable)."""
    agent_llm, judge_llm = Metered(agent_llm or LLMClient()), Metered(judge_llm or LLMClient())
    async with _tx(db) as conn:
        run_id = (await conn.execute(text(
            "INSERT INTO quality_evalrun (id, model, git_sha, notes) VALUES (gen_random_uuid(), :m, :g, '')"
            " RETURNING id"), {"m": config.AGENT_MODEL, "g": os.environ.get("GIT_SHA", "")})).scalar()
    s = {"total": len(cases), "passed": 0, "grounding_failures": 0, "known_item_grounding_failures": 0,
         "turns": 0, "latency_ms": 0, "failing": []}
    for case in cases:
        try:
            o = await run_case(case, agent_llm, db)
        except Exception as e:  # one broken case (BoxAPI down, bad JSON) must not lose the rest of the run
            o = Outcome([], [], [], [], False, {}, [], 0.0)
            score, notes, why = 0.0, "", [f"crashed: {type(e).__name__}: {e}"]
        else:
            score, notes = await judge(case, o, judge_llm)
            why = hard_checks(case["expected"], o) + ([f"judge {score:.2f}: {notes}"] if score < PASS_SCORE
                                                      else [])
        passed = not why
        s["passed"] += passed
        s["grounding_failures"] += o.fallback
        s["known_item_grounding_failures"] += o.fallback and "known_item" in case.get("tags", [])
        s["turns"] += len(o.latency_ms)
        s["latency_ms"] += sum(o.latency_ms)
        if not passed:
            s["failing"].append({"title": case["title"], "why": why})
        print(f"{'PASS' if passed else 'FAIL'} {case['title']}" + ("" if passed else f" — {'; '.join(why)}"),
              flush=True)
        async with _tx(db) as conn:
            case_id = await _save_case(conn, case)
            await conn.execute(text(
                "INSERT INTO quality_evalresult (id, run_id, case_id, passed, score, transcript, judge_notes)"
                " VALUES (gen_random_uuid(), :r, :c, :p, :s, CAST(:t AS jsonb), :n)"),
                {"r": run_id, "c": case_id, "p": passed, "s": score, "n": notes,
                 "t": json.dumps({"user_turns": case["user_turns"], **asdict(o), "failures": why},
                                 ensure_ascii=False, default=str)})
    s["mean_latency_ms"] = s.pop("latency_ms") // max(s["turns"], 1)
    s["cost_usd"] = round(agent_llm.cost + judge_llm.cost, 4)
    s["pass_rate"] = s["passed"] / max(s["total"], 1)
    s["gate"] = s["pass_rate"] >= GATE_PASS_RATE and s["known_item_grounding_failures"] == 0
    line = (f"pass {s['passed']}/{s['total']} ({s['pass_rate']:.0%}) · grounding failures"
            f" {s['grounding_failures']} (known-item {s['known_item_grounding_failures']}) · mean latency"
            f" {s['mean_latency_ms']} ms/turn · cost ${s['cost_usd']}"
            f" · gate {'met' if s['gate'] else 'open'}")
    async with _tx(db) as conn:
        await conn.execute(text("UPDATE quality_evalrun SET notes = :n WHERE id = :r"),
                           {"n": line, "r": run_id})
    print(line)
    return s


if __name__ == "__main__":
    sys.exit(0 if asyncio.run(run(load_cases()))["gate"] else 1)
