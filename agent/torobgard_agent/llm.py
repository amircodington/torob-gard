import json
import logging
import re
from collections.abc import AsyncIterator
from dataclasses import dataclass, field

from openai import APIStatusError, AsyncOpenAI

from . import config


@dataclass
class ToolCall:
    id: str
    name: str
    args: dict


@dataclass
class ChatResult:
    content: str | None
    tool_calls: list[ToolCall] = field(default_factory=list)
    tokens_in: int = 0
    tokens_out: int = 0
    cost: float = 0.0  # USD, when BoxAPI reports usage.cost


@dataclass
class Delta:
    """One stream fragment: text, a tool-call fragment (args_json is partial), or final usage."""

    text: str | None = None
    tool_index: int | None = None
    tool_id: str | None = None
    tool_name: str | None = None
    args_json: str | None = None
    tokens_in: int | None = None
    tokens_out: int | None = None


_ACTION = re.compile(r"```json\s*(\{.*?\})\s*```", re.S)


def _describe_tools(tools: list[dict]) -> str:
    lines = [
        "You may call a tool by replying with a fenced block exactly like:",
        '```json\n{"action": "<tool name>", "args": {...}}\n```',
        "Tools:",
    ]
    for t in tools:
        f = t["function"]
        params = json.dumps(f.get("parameters", {}))
        lines.append(f"- {f['name']}: {f.get('description', '')} params={params}")
    return "\n".join(lines)


def _parse_action(content: str | None) -> list[ToolCall]:
    m = _ACTION.search(content or "")
    if not m:
        return []
    try:
        d = json.loads(m.group(1))
        return [ToolCall("json-action-0", d["action"], d.get("args") or {})]
    except (ValueError, KeyError, TypeError):
        return []


log = logging.getLogger(__name__)
_QUOTA = re.compile(r"credit|quota|balance|insufficient|billing", re.I)
_switched = False  # process-wide: once the first key is spent, every client uses the second


def is_quota_error(e: Exception) -> bool:
    """BoxAPI says the key is out of credit: 402, or 401/403/429 whose error mentions credit/quota."""
    if not isinstance(e, APIStatusError):
        return False
    return e.status_code == 402 or (
        e.status_code in (401, 403, 429) and bool(_QUOTA.search(f"{e.message} {e.body}"))
    )


class LLMClient:
    def __init__(self, client: AsyncOpenAI | None = None, supports_tools: bool | None = None,
                 temperature: float | None = None, second_client: AsyncOpenAI | None = None):
        self.primary = client or AsyncOpenAI(
            base_url=config.BOXAPI_BASE_URL, api_key=config.BOXAPI_KEY, timeout=config.LLM_TIMEOUT_S,
            max_retries=1)
        self.second = second_client or (
            AsyncOpenAI(base_url=config.BOXAPI_BASE_URL, api_key=config.BOXAPI_KEY_SECOND,
                        timeout=config.LLM_TIMEOUT_S, max_retries=1)
            if config.BOXAPI_KEY_SECOND else None
        )
        self.supports_tools = config.BOXAPI_TOOLS if supports_tools is None else supports_tools
        self.temperature = temperature  # None: the model's default (live chat); evals pin it

    @property
    def client(self) -> AsyncOpenAI:
        return self.second if _switched and self.second else self.primary

    async def _create(self, method: str, **kw):
        """Call client.<method>.create; on a quota error switch to the second key and retry once."""
        global _switched
        obj = lambda c: c.chat.completions if method == "chat" else c.embeddings  # noqa: E731
        try:
            return await obj(self.client).create(**kw)
        except APIStatusError as e:
            if not self.second or _switched or not is_quota_error(e):
                raise
            _switched = True
            log.warning("BoxAPI key out of credit (HTTP %s); using the second key", e.status_code)
            return await obj(self.second).create(**kw)

    async def embed(self, model: str, input: list[str], dimensions: int):
        return await self._create("embed", model=model, input=input, dimensions=dimensions)

    async def chat(
        self, messages: list[dict], tools: list[dict] | None, model: str, stream: bool = False
    ) -> ChatResult | AsyncIterator[Delta]:
        # reasoning models reject max_tokens, so no cap is sent
        kw: dict = {"model": model, "messages": messages}
        if self.temperature is not None:
            kw["temperature"] = self.temperature
        if tools and self.supports_tools:
            kw["tools"] = tools
        elif tools:
            kw["messages"] = [{"role": "system", "content": _describe_tools(tools)}, *messages]
        if stream:
            return self._stream(kw)
        r = await self._create("chat", **kw)
        msg = r.choices[0].message
        calls = [
            ToolCall(c.id, c.function.name, json.loads(c.function.arguments or "{}"))
            for c in msg.tool_calls or []
        ] or ([] if self.supports_tools or not tools else _parse_action(msg.content))
        u = r.usage
        return ChatResult(msg.content, calls, u.prompt_tokens if u else 0, u.completion_tokens if u else 0,
                          float(getattr(u, "cost", 0) or 0))

    async def _stream(self, kw: dict) -> AsyncIterator[Delta]:
        s = await self._create("chat", **kw, stream=True, stream_options={"include_usage": True})
        async for ch in s:
            if ch.usage:
                yield Delta(tokens_in=ch.usage.prompt_tokens, tokens_out=ch.usage.completion_tokens)
            for c in ch.choices:
                if c.delta.content:
                    yield Delta(text=c.delta.content)
                for t in c.delta.tool_calls or []:
                    f = t.function
                    yield Delta(
                        tool_index=t.index, tool_id=t.id, tool_name=f and f.name,
                        args_json=f and f.arguments,
                    )
