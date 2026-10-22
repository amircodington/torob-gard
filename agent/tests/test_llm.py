import json

import httpx
import pytest
import respx
from fastapi.testclient import TestClient
from openai import APIStatusError, AsyncOpenAI

from torobgard_agent import llm
from torobgard_agent.llm import LLMClient
from torobgard_agent.main import app

BASE = "http://boxapi.test/v1"
TOOLS = [{"type": "function", "function": {
    "name": "search_products", "description": "find",
    "parameters": {"type": "object", "properties": {"q": {"type": "string"}}}}}]


def client(tools: bool) -> LLMClient:
    return LLMClient(AsyncOpenAI(base_url=BASE, api_key="k"), supports_tools=tools)


def completion(message: dict) -> dict:
    return {"id": "c", "object": "chat.completion", "created": 0, "model": "m",
            "choices": [{"index": 0, "finish_reason": "stop", "message": {"role": "assistant", **message}}],
            "usage": {"prompt_tokens": 7, "completion_tokens": 3, "total_tokens": 10}}


@respx.mock
async def test_native_tool_calls():
    route = respx.post(f"{BASE}/chat/completions").respond(json=completion({
        "content": None,
        "tool_calls": [{"id": "t1", "type": "function",
                        "function": {"name": "search_products", "arguments": '{"q": "گوشی"}'}}]}))
    r = await client(True).chat([{"role": "user", "content": "hi"}], TOOLS, "m", stream=False)
    assert [(c.id, c.name, c.args) for c in r.tool_calls] == [("t1", "search_products", {"q": "گوشی"})]
    assert (r.tokens_in, r.tokens_out) == (7, 3)
    body = json.loads(route.calls[0].request.content)
    assert "tools" in body and "max_tokens" not in body


@respx.mock
async def test_json_action_fallback():
    reply = 'ok\n```json\n{"action": "search_products", "args": {"q": "x"}}\n```'
    route = respx.post(f"{BASE}/chat/completions").respond(json=completion({"content": reply}))
    r = await client(False).chat([{"role": "user", "content": "hi"}], TOOLS, "m", stream=False)
    assert [(c.name, c.args) for c in r.tool_calls] == [("search_products", {"q": "x"})]
    body = json.loads(route.calls[0].request.content)
    assert "tools" not in body
    assert body["messages"][0]["role"] == "system" and "search_products" in body["messages"][0]["content"]


@respx.mock
async def test_fallback_without_action_keeps_content():
    respx.post(f"{BASE}/chat/completions").respond(json=completion({"content": "just text"}))
    r = await client(False).chat([{"role": "user", "content": "hi"}], TOOLS, "m", stream=False)
    assert r.tool_calls == [] and r.content == "just text"


@respx.mock
async def test_stream_yields_deltas_and_usage():
    def ev(d):
        return "data: " + json.dumps(d) + "\n\n"
    base = {"id": "c", "object": "chat.completion.chunk", "created": 0, "model": "m"}
    body = (
        ev({**base, "choices": [{"index": 0, "delta": {"content": "سلام"}}]})
        + ev({**base, "choices": [{"index": 0, "delta": {"tool_calls": [
            {"index": 0, "id": "t1", "function": {"name": "search_products", "arguments": '{"q"'}}]}}]})
        + ev({**base, "choices": [], "usage": {"prompt_tokens": 5, "completion_tokens": 2}})
        + "data: [DONE]\n\n"
    )
    respx.post(f"{BASE}/chat/completions").mock(return_value=httpx.Response(
        200, headers={"content-type": "text/event-stream"}, content=body))
    it = await client(True).chat([{"role": "user", "content": "hi"}], TOOLS, "m", stream=True)
    ds = [d async for d in it]
    assert ds[0].text == "سلام"
    assert (ds[1].tool_name, ds[1].args_json) == ("search_products", '{"q"')
    assert (ds[-1].tokens_in, ds[-1].tokens_out) == (5, 2)


def test_health():
    assert TestClient(app).get("/agent/health").json() == {"ok": True}


@respx.mock
async def test_temperature_only_when_set():
    route = respx.post(f"{BASE}/chat/completions").respond(json=completion({"content": "ok"}))
    await client(True).chat([{"role": "user", "content": "hi"}], None, "m")
    t0 = LLMClient(AsyncOpenAI(base_url=BASE, api_key="k"), supports_tools=True, temperature=0)
    await t0.chat([{"role": "user", "content": "hi"}], None, "m")
    bodies = [json.loads(c.request.content) for c in route.calls]
    assert "temperature" not in bodies[0] and bodies[1]["temperature"] == 0


def two_keys() -> LLMClient:
    llm._switched = False
    def mk(k):
        return AsyncOpenAI(base_url=BASE, api_key=k, max_retries=0)

    return LLMClient(mk("k1"), supports_tools=True, second_client=mk("k2"))


def by_key(request: httpx.Request) -> httpx.Response:
    if request.headers["authorization"] == "Bearer k1":
        return httpx.Response(402, json={"error": {"message": "Insufficient credit"}})
    return httpx.Response(200, json=completion({"content": "ok"}))


@respx.mock
async def test_quota_error_switches_to_second_key_for_good():
    route = respx.post(f"{BASE}/chat/completions").mock(side_effect=by_key)
    c = two_keys()
    assert (await c.chat([{"role": "user", "content": "hi"}], None, "m")).content == "ok"
    assert (await c.chat([{"role": "user", "content": "hi"}], None, "m")).content == "ok"
    auth = [x.request.headers["authorization"] for x in route.calls]
    assert auth == ["Bearer k1", "Bearer k2", "Bearer k2"]
    llm._switched = False


@respx.mock
async def test_plain_rate_limit_does_not_switch():
    respx.post(f"{BASE}/chat/completions").respond(429, json={"error": {"message": "Too many requests"}})
    c = two_keys()
    with pytest.raises(APIStatusError):
        await c.chat([{"role": "user", "content": "hi"}], None, "m")
    assert llm._switched is False


@respx.mock
async def test_quota_error_without_second_key_surfaces(monkeypatch):
    monkeypatch.setattr(llm.config, "BOXAPI_KEY_SECOND", "")
    respx.post(f"{BASE}/chat/completions").respond(402, json={"error": {"message": "no credit"}})
    llm._switched = False
    with pytest.raises(APIStatusError):
        await client(True).chat([{"role": "user", "content": "hi"}], None, "m")
