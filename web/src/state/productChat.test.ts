import { describe, expect, it } from "vitest";
import { productChat, productChatStart } from "./productChat";
import type { Action } from "./session";

describe("productChat", () => {
  it("a turn's actions: the user's bubble, the streamed say, ask chips, the agent's session id", () => {
    const s = ([
      { type: "CHAT_USER", text: "باتریش خوبه؟" },
      { type: "AGENT_TOKEN", text: "۵۰۰۰ میلی‌آمپره؛ " },
      { type: "AGENT_TOKEN", text: "یه مدل دیگه هم ببینیم؟" },
      { type: "AGENT_MSG", msg: { from: "assistant", text: "یه مدل دیگه هم ببینیم؟", chips: [{ id: "agent:آره", label: "آره" }] } },
      { type: "SET_REQ", req: { category: "mobile" } },
      { type: "GO", stage: "products" },
      { type: "AGENT_DONE", sessionId: "s-9" },
    ] satisfies Action[] as Action[]).reduce(productChat, productChatStart("s-1"));
    expect(s.msgs.map((m) => [m.from, m.text])).toEqual([["user", "باتریش خوبه؟"], ["assistant", "۵۰۰۰ میلی‌آمپره؛ یه مدل دیگه هم ببینیم؟"]]);
    expect(s.msgs[1].chips?.map((c) => c.label)).toEqual(["آره"]);
    expect(s.sessionId).toBe("s-9");
  });

  it("the agent down: the question stays, an honest line answers, no rule consult", () => {
    const s = ([{ type: "CHAT_TEXT", text: "گارانتی داره؟" }, { type: "AGENT_OFFLINE" }] satisfies Action[] as Action[]).reduce(productChat, productChatStart("s-1"));
    expect(s.msgs.map((m) => m.from)).toEqual(["user", "assistant"]);
    expect(s.msgs[1].text).toContain("در دسترس نیست");
  });
});
