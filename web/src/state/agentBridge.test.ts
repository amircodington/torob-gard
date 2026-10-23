import { describe, expect, it } from "vitest";
import type { AgentEvent } from "../lib/sse";
import { bridge, consult, reopenChat } from "./agentBridge";
import { initialState, reducer } from "./session";

const BODY = { text: "یه گوشی می‌خوام", context: { req: null, anchor: null, stage: "consult" } };

describe("bridge", () => {
  it("ask → an assistant message with the option chips", () => {
    const [a] = bridge({ event: "block", data: { type: "ask", question: "بودجه‌ات چقدره؟", options: ["تا ۱۰ میلیون", "۱۰ تا ۳۰"] } });
    const s = reducer(initialState(), a);
    const m = s.chat[s.chat.length - 1];
    expect(m.from).toBe("assistant");
    expect(m.text).toBe("بودجه‌ات چقدره؟");
    expect(m.chips).toEqual([
      { id: "agent:تا ۱۰ میلیون", label: "تا ۱۰ میلیون" },
      { id: "agent:۱۰ تا ۳۰", label: "۱۰ تا ۳۰" },
    ]);
  });

  it("desk → the req and the desk stage", () => {
    const s = bridge({ event: "block", data: { type: "desk", category: "mobile", budget_min: 0, budget_max: 30_000_000, priority: "camera" } })
      .reduce(reducer, initialState());
    expect(s.stage).toBe("products");
    expect(s.req).toMatchObject({ category: "mobile", budgetId: "custom", priorityId: "camera" });
    expect(s.req.customBudget).toMatchObject({ min: 0, max: 30_000_000 });
  });

  it("desk for a new category keeps its own priority", () => {
    const s = bridge({ event: "block", data: { type: "desk", category: "headphone", budget_min: null, budget_max: 5_000_000, priority: "anc" } })
      .reduce(reducer, initialState());
    expect(s.req).toMatchObject({ category: "headphone", priorityId: "anc" });
  });

  it("shop_cards → a message with up to 3 offers", () => {
    const [a] = bridge({ event: "block", data: { type: "shop_cards", shop_ids: ["s1"], offer_ids: ["o1", "o2", "o3", "o4"], why: { s1: "ارزون‌ترین" } } });
    const s = reducer(initialState(), a);
    expect(s.chat[s.chat.length - 1].shopCards).toEqual({ offerIds: ["o1", "o2", "o3"], why: { s1: "ارزون‌ترین" } });
  });
});

describe("consult", () => {
  it("a whole turn: status goes to the progress line, the rest becomes actions", async () => {
    const statuses: string[] = [];
    async function* stream(): AsyncGenerator<AgentEvent> {
      yield { event: "status", data: { text: "دارم نیازت رو می‌فهمم…" } };
      yield { event: "token", data: { text: "باشه!" } };
      yield { event: "block", data: { type: "ask", question: "باشه!", options: ["الف"] } };
      yield { event: "done", data: { message_id: "m", receipt_ids: [], session_id: "sid" } };
    }
    const actions = await consult(BODY, (t) => statuses.push(t), stream);
    const s = actions.reduce(reducer, initialState());
    expect(statuses).toEqual(["دارم نیازت رو می‌فهمم…"]);
    expect(s.chat.slice(-2).map((m) => [m.from, m.text, m.chips?.length])).toEqual([
      ["user", BODY.text, undefined],
      ["assistant", "باشه!", 1], // the ask's question was already said: its chips join that message
    ]);
    expect(s.agentSessionId).toBe("sid");
    expect(s.agentOffline).toBe(false);
  });

  it("a stalled stream falls back to the reducer and sets the banner flag", async () => {
    async function* stream(_b: unknown, signal: AbortSignal): AsyncGenerator<AgentEvent> {
      yield { event: "status", data: { text: "…" } };
      await new Promise((_, reject) => signal.addEventListener("abort", () => reject(new Error("aborted"))));
    }
    const actions = await consult(BODY, () => {}, stream, 20);
    expect(actions).toEqual([{ type: "CHAT_TEXT", text: BODY.text }, { type: "AGENT_OFFLINE" }]);
    const s = actions.reduce(reducer, initialState());
    expect(s.agentOffline).toBe(true);
    expect(s.req.category).toBe("mobile"); // the P1 reducer answered
  });

  it("a fallback does not latch: the next turn's done clears the banner flag", async () => {
    async function* ok(): AsyncGenerator<AgentEvent> {
      yield { event: "done", data: { message_id: "m", receipt_ids: [], session_id: "sid" } };
    }
    const offline = reducer(initialState(), { type: "AGENT_OFFLINE" });
    const s = (await consult(BODY, () => {}, ok)).reduce(reducer, offline);
    expect(s.agentOffline).toBe(false);
  });

  it("an error event falls back too", async () => {
    async function* stream(): AsyncGenerator<AgentEvent> {
      yield { event: "error", data: { message: "agent unavailable" } };
    }
    expect((await consult(BODY, () => {}, stream))[1]).toEqual({ type: "AGENT_OFFLINE" });
  });

  it("a turn that keeps sending status but never finishes falls back at the turn cap", async () => {
    async function* stream(_b: unknown, signal: AbortSignal): AsyncGenerator<AgentEvent> {
      while (!signal.aborted) {
        yield { event: "status", data: { text: "هنوز دارم روش کار می‌کنم…" } };
        await new Promise((r) => setTimeout(r, 5));
      }
      throw new Error("aborted");
    }
    const actions = await consult(BODY, () => {}, stream, 1000, { maxMs: 40 });
    expect(actions).toEqual([{ type: "CHAT_TEXT", text: BODY.text }, { type: "AGENT_OFFLINE" }]);
  });

  it("a new chat aborts the turn: no actions at all, not even the fallback", async () => {
    async function* stream(_b: unknown, signal: AbortSignal): AsyncGenerator<AgentEvent> {
      yield { event: "status", data: { text: "…" } };
      await new Promise((_, reject) => signal.addEventListener("abort", () => reject(new Error("aborted"))));
    }
    const outer = new AbortController();
    setTimeout(() => outer.abort(), 10);
    expect(await consult(BODY, () => {}, stream, 1000, { signal: outer.signal })).toEqual([]);
  });
});

describe("reopenChat", () => {
  it("rebuilds a saved chat on a fresh epoch: bubbles, ask chips, the desk's need, the same agent session", () => {
    const start = reducer(initialState(), { type: "CHAT_TEXT", text: "گوشی" });
    const s = reopenChat("s-1", [
      { from: "user", text: "یه لپ‌تاپ سبک", blocks: [] },
      { from: "assistant", text: "بودجه‌ت؟", blocks: [{ type: "ask", question: "بودجه‌ت؟", options: ["تا ۱۸۰ میلیون"] }] },
      { from: "user", text: "تا ۱۸۰ میلیون", blocks: [] },
      { from: "assistant", text: "سه گزینه:", blocks: [{ type: "desk", category: "laptop", budget_min: 0, budget_max: 180_000_000, priority: "weight" }] },
    ]).reduce(reducer, start);
    expect(s.epoch).toBe(start.epoch + 1);
    expect(s.agentSessionId).toBe("s-1");
    expect(s.stage).toBe("consult"); // reopening reads the chat; it does not jump to the desk
    expect(s.chat.slice(1).map((m) => [m.from, m.text])).toEqual([
      ["user", "یه لپ‌تاپ سبک"], ["assistant", "بودجه‌ت؟"], ["user", "تا ۱۸۰ میلیون"], ["assistant", "سه گزینه:"],
    ]);
    expect(s.chat[2].chips?.map((c) => c.label)).toEqual(["تا ۱۸۰ میلیون"]);
    expect(s.req).toMatchObject({ category: "laptop", priorityId: "weight" });
  });
});

const last = (s: ReturnType<typeof initialState>) => s.chat[s.chat.length - 1];

describe("the need the agent understood", () => {
  it("done carries it into the session, so a later fallback keeps the category and reads the budget", () => {
    const done = { event: "done", data: { message_id: "m", receipt_ids: [], session_id: "s", need: { category: "headphone" } } } as AgentEvent;
    let s = bridge(done).reduce(reducer, initialState());
    expect(s.req.category).toBe("headphone");
    s = reducer(s, { type: "CHAT_TEXT", text: "۵ میلیون تومن تا ۷ تومن" }); // the agent timed out: the rule consult answers
    expect(s.req.customBudget).toMatchObject({ min: 5_000_000, max: 7_000_000 });
    expect(last(s).chips?.some((c) => c.id.startsWith("prio:"))).toBe(true);
  });
});

it("an ask after a say joins it as one bubble with the chips (not a second bubble)", () => {
  const s = [
    { type: "AGENT_TOKEN", text: "حتماً! بودجه‌ت حدوداً چقدره؟" },
    { type: "AGENT_MSG", msg: { from: "assistant", text: "کدوم بازه نزدیک‌تره؟", chips: [{ id: "agent:تا ۲", label: "تا ۲" }] } },
  ].reduce((st, a) => reducer(st, a as Parameters<typeof reducer>[1]), reducer(initialState(), { type: "CHAT_USER", text: "هدفون" }));
  expect(s.chat.slice(-1)[0]).toMatchObject({ from: "assistant", text: "حتماً! بودجه‌ت حدوداً چقدره؟\nکدوم بازه نزدیک‌تره؟" });
  expect(s.chat.slice(-1)[0].chips).toHaveLength(1);
  expect(s.chat).toHaveLength(3);
});
