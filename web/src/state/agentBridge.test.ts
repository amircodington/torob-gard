import { describe, expect, it } from "vitest";
import type { AgentEvent } from "../lib/sse";
import { bridge, consult } from "./agentBridge";
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
});
