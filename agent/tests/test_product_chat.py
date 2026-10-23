"""Chat about one product (the product page's sheet): the agent knows it, grounded, and still searches."""
import json

import test_search
from test_orchestrator import FakeLLM, say
from test_tools import add_p610

from torobgard_agent.context import TurnContext
from torobgard_agent.orchestrator import FALLBACK, Token, run_turn

conn = test_search.conn


async def test_the_product_in_context_is_known_and_its_prices_are_grounded(conn):
    await add_p610(conn)
    llm = FakeLLM(say({"say": "ارزون‌ترینش ۶۰۰٬۰۰۰ تومانه."}))
    ctx = TurnContext(product_id="t_p610", stage="product")
    events = [e async for e in run_turn(None, "ارزون‌ترینش چنده؟", ctx, llm=llm, db=conn)]
    said = "".join(e.text for e in events if isinstance(e, Token))
    assert said == "ارزون‌ترینش ۶۰۰٬۰۰۰ تومانه." and said != FALLBACK
    [call] = llm.calls
    note = next(m["content"] for m in call["messages"] if m["content"].startswith("زمینه‌ی این گفتگو"))
    product = json.loads(note.split("\n", 1)[1])["product"]
    assert (product["product_id"], product["min"], product["offer_count"]) == ("t_p610", 600_000, 3)
    assert call["tools"]  # the other products stay one search away


async def test_an_unknown_product_id_is_left_out(conn):
    llm = FakeLLM(say({"say": "سلام!"}))
    [e async for e in run_turn(None, "سلام", TurnContext(product_id="nope"), llm=llm, db=conn)]
    assert '"product": ' not in llm.calls[0]["messages"][1]["content"]
