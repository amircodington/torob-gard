/* The product page's chat: the consult's agent actions, applied to a small chat of its own (no journey state). */

import type { Action, Msg } from "./session";

export interface ProductChatState {
  msgs: Omit<Msg, "id">[];
  sessionId: string;
}

export const OFFLINE_LINE = "دستیار الان در دسترس نیست؛ چند دقیقه‌ی دیگه دوباره بپرس.";

export const productChatStart = (sessionId: string): ProductChatState => ({ msgs: [], sessionId });

export function productChat(s: ProductChatState, a: Action): ProductChatState {
  const last = s.msgs[s.msgs.length - 1];
  const push = (m: Omit<Msg, "id">) => ({ ...s, msgs: [...s.msgs, m] });
  switch (a.type) {
    case "CHAT_USER":
    case "CHAT_TEXT": // the fallback's user text; the rule consult does not answer about one product
      return push({ from: "user", text: a.text });
    case "AGENT_OFFLINE":
      return push({ from: "assistant", text: OFFLINE_LINE });
    case "AGENT_TOKEN":
      return last?.from === "assistant" && !last.chips && !last.shopCards
        ? { ...s, msgs: [...s.msgs.slice(0, -1), { ...last, text: last.text + a.text }] }
        : push({ from: "assistant", text: a.text });
    case "AGENT_MSG":
      // an ask joins the say before it, as in the consult: one bubble with the chips
      if (a.msg.chips && a.msg.text && last?.from === "assistant" && !last.chips && !last.shopCards) {
        const text = last.text.includes(a.msg.text) ? last.text : `${last.text}\n${a.msg.text}`;
        return { ...s, msgs: [...s.msgs.slice(0, -1), { ...last, text, chips: a.msg.chips }] };
      }
      return push(a.msg);
    case "AGENT_DONE":
      return { ...s, sessionId: a.sessionId ?? s.sessionId };
    default: // SET_REQ / GO: the desk belongs to the consult, not to one product's page
      return s;
  }
}
