"""«جمع‌بندی فروشنده‌ها»: the sellers' own offer notes, summarised; never a price, a link or a buyer review."""
import json

import test_search
from sqlalchemy import text
from test_tools import add_p610

from torobgard_agent.llm import ChatResult
from torobgard_agent.seller_notes import seller_notes

conn = test_search.conn


class LLM:
    def __init__(self, out=None, exc=None):
        self.out, self.exc, self.calls = out, exc, []

    async def chat(self, messages, tools, model, stream=False):
        self.calls.append(messages)
        if self.exc:
            raise self.exc
        return ChatResult(json.dumps(self.out, ensure_ascii=False))


async def notes(conn, *rows):
    await add_p610(conn)
    for oid, desc, warranty in rows:
        await conn.execute(text("UPDATE catalog_offer SET description = :d, warranty = :w WHERE id = :o"),
                           {"o": oid, "d": desc, "w": warranty})


async def test_points_come_back_and_prices_or_links_are_dropped(conn):
    await notes(conn, ("t_q1", "اصل، پلمپ، با فاکتور", None),
                ("t_q2", "این کالا ۲ میلیون تومان است", '{"provider": "گارانتی ۱۸ ماهه آواژنگ"}'))
    llm = LLM({"points": ["بیشتر فروشنده‌ها می‌گن اصل و پلمپه", "قیمتش ۲ میلیون تومانه",
                          "گارانتی ۱۸ ماهه آواژنگ هم داره", "ببین www.shop.ir"]})
    out = await seller_notes("t_p610", llm, db=conn)
    assert out == {"points": ["بیشتر فروشنده‌ها می‌گن اصل و پلمپه", "گارانتی ۱۸ ماهه آواژنگ هم داره"],
                   "notes": 2}
    sent = llm.calls[0][1]["content"]
    assert "<data>اصل، پلمپ، با فاکتور</data>" in sent  # seller text is data, not instructions


async def test_one_note_is_not_enough_and_no_model_is_called(conn):
    await notes(conn, ("t_q1", "اصل و پلمپ", None))
    llm = LLM({"points": ["x"]})
    assert await seller_notes("t_p610", llm, db=conn) == {"points": [], "notes": 1}
    assert llm.calls == []


async def test_a_model_failure_gives_no_points(conn):
    await notes(conn, ("t_q1", "اصل و پلمپ", None), ("t_q2", "با گارانتی", None))
    assert await seller_notes("t_p610", LLM(exc=TimeoutError()), db=conn) == {"points": [], "notes": 2}


def test_route_caches_a_summary_for_a_day(monkeypatch):
    from fastapi.testclient import TestClient

    from torobgard_agent import api
    from torobgard_agent.main import app

    calls = []

    class Cache:
        store: dict = {}

        async def get(self, k):
            return self.store.get(k, (None,))[0]

        async def set(self, k, v, ex):
            self.store[k] = (v, ex)

    async def fake(product_id):
        calls.append(product_id)
        return {"points": ["فروشنده‌ها می‌گن اصله"], "notes": 3}

    async def yes(*a):
        return True
    cache = Cache()
    monkeypatch.setattr(api, "seller_notes", fake)
    monkeypatch.setattr(api, "allow", yes)
    monkeypatch.setattr(api, "redis", lambda: cache)
    c = TestClient(app)
    for _ in range(2):
        r = c.post("/agent/seller_notes", json={"product_id": "product_1"})
        assert r.json() == {"points": ["فروشنده‌ها می‌گن اصله"], "notes": 3}
    assert calls == ["product_1"] and cache.store["notes:product_1"][1] == 86400
