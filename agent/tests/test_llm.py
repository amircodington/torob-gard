import json

import httpx
import respx
from fastapi.testclient import TestClient
from openai import AsyncOpenAI

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
