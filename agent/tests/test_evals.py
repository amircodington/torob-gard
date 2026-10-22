import json
import os

import pytest
from sqlalchemy import text

from torobgard_agent import evals
from torobgard_agent.db import make_engine
from torobgard_agent.evals import Outcome, hard_checks, load_cases


def outcome(**kw) -> Outcome:
    return Outcome(**{"says": ["x"], "blocks": [], "receipts": [], "violations": [], "fallback": False,
                      "offer_prices": {}, "latency_ms": 1, "cost": 0.0, **kw})


def test_missing_cited_shop_fails():
    assert hard_checks({"must_cite_shop": ["shop_a"]}, outcome(receipts=["shop_b"]))
    assert not hard_checks({"must_cite_shop": ["shop_a"]}, outcome(receipts=["shop_b", "shop_a"]))


def test_floor_price_banned_words_block_and_fallback():
    assert hard_checks({"must_mention_floor": True}, outcome(says=["تو پاساژ علاءالدینه"]))
    assert not hard_checks({"must_mention_floor": "6"}, outcome(says=["طبقه‌ی ۶، واحد ۶۳۱"]))
    assert hard_checks({"must_mention_floor": "6"}, outcome(says=["طبقه‌ی ۲"]))
    assert not hard_checks({"must_mention_floor": True}, outcome(says=["همکف"]))
    assert hard_checks({"max_price": 1_000_000}, outcome(says=["۱٫۲ میلیون تومان"]))
    pricey = outcome(receipts=["offer_1"], offer_prices={"offer_1": 2_000_000})
    assert hard_checks({"max_price": 1_000_000}, pricey)
    assert not hard_checks({"max_price": 1_000_000}, outcome(says=["۹۰۰ هزار تومان"]))
    assert hard_checks({"must_not_say": ["0 تومان"]}, outcome(says=["قیمتش ۰ تومانه"]))
    assert not hard_checks({"must_not_say": ["0 تومان"]}, outcome(says=["میانه ۹۷٬۹۰۰٬۰۰۰ تومان"]))
    assert not hard_checks({"must_not_say": ["موجوده"]}, outcome(says=["نتونستم تأیید کنم موجوده یا نه"]))
    assert hard_checks({"must_not_say": ["موجوده"]}, outcome(says=["آره موجوده."]))
    # the «… یا نه» question skip is for stock phrases only
    assert hard_checks({"must_not_say": ["تومان"]}, outcome(says=["۵ تومان یا نه؟"]))
    desk = {"type": "desk", "category": "mobile", "budget_max": 18_000_000}
    assert not hard_checks({"must_block": {"type": "desk", "budget_max": 18_000_000}}, outcome(blocks=[desk]))
    assert hard_checks({"must_block": {"type": "desk", "budget_max": 20_000_000}}, outcome(blocks=[desk]))
    assert hard_checks({}, outcome(fallback=True))  # an ungrounded answer is never a pass
    either = {"must_block": [{"type": "desk", "budget_max": 20_000_000},
                             {"type": "desk", "category": "mobile"}]}
    assert not hard_checks(either, outcome(blocks=[desk]))  # a list: any one of the blocks will do
    assert hard_checks({"must_block": [{"type": "ask"}, {"type": "route"}]}, outcome(blocks=[desk]))


def test_loader_prefers_students_cases_over_seed(tmp_path):
    (tmp_path / "P2").mkdir()
    seed = [{"title": "s", "user_turns": ["سلام"], "expected": {}, "tags": []}]
    (tmp_path / "P2" / "eval-seed.json").write_text(json.dumps(seed))
    assert load_cases(tmp_path)[0]["title"] == "s"
    (tmp_path / "T-05").mkdir()
    (tmp_path / "T-05" / "eval-cases.json").write_text(json.dumps([{**seed[0], "title": "t"}]))
    assert load_cases(tmp_path)[0]["title"] == "t"


def test_shipped_seed_has_twelve_cases_and_known_items():
    cases = load_cases(evals.REPO_EVIDENCE)
    assert len(cases) == 12 and sum("known_item" in c["tags"] for c in cases) >= 4
    assert all(c["user_turns"] and isinstance(c["expected"], dict) for c in cases)


class FakeLLM:
    supports_tools = True

    def __init__(self, *replies):
        self.replies = list(replies)

    async def chat(self, messages, tools, model, stream=False):
        from torobgard_agent.llm import ChatResult
        return ChatResult(self.replies.pop(0), cost=0.01)


@pytest.fixture
async def conn():
    engine = make_engine(os.environ["TEST_DATABASE_URL"])
    async with engine.connect() as c:
        await c.begin()
        yield c
        await c.rollback()
    await engine.dispose()


async def test_run_writes_eval_run_and_results(conn):
    case = {"title": "سلام", "user_turns": ["سلام"], "expected": {"must_cite_shop": ["shop_a"]}, "tags": []}
    agent = FakeLLM(json.dumps({"say": "سلام! دنبال چی هستی؟"}))
    judge = FakeLLM('{"score": 0.9, "notes": "ok"}')
    summary = await evals.run([case], agent_llm=agent, judge_llm=judge, db=conn)
    assert summary["passed"] == 0 and summary["total"] == 1
    row = (await conn.execute(text(
        "SELECT r.passed, r.score, r.transcript, r.judge_notes FROM quality_evalresult r"
        " JOIN quality_evalcase c ON c.id = r.case_id WHERE c.title = 'سلام'"))).one()
    assert row[0] is False and row[1] == 0.9 and "shop_a" in json.dumps(row[2]) and row[3] == "ok"
