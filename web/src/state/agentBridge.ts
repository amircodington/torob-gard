/* The agent's events → P1 reducer actions; any failure falls back to the rule reducer (PLAN §2, stage 1). */

import { PRIORITIES } from "../config/journey";
import { faPrice } from "../lib/fa";
import { streamChat, type AgentEvent, type ChatBody } from "../lib/sse";
import type { Category } from "../lib/types";
import type { Action, JourneyReq } from "./session";

/** Ruling R7: no event of any kind (status included) for this long → abort and fall back. */
export const STALL_MS = 8000;

const CATEGORIES: Category[] = ["mobile", "laptop", "tablet", "tv", "headphone", "powerbank", "photo", "accessory", "other"];

function deskReq(b: Record<string, unknown>): Partial<JourneyReq> {
  const req: Partial<JourneyReq> = {};
  const cat = CATEGORIES.find((c) => c === b.category);
  if (cat) req.category = cat;
  const min = typeof b.budget_min === "number" ? b.budget_min : null;
  const max = typeof b.budget_max === "number" ? b.budget_max : null;
  if (min !== null || max !== null) {
    const label = max === null ? `از ${faPrice(min!)}` : !min ? `تا ${faPrice(max)}` : `${faPrice(min)} تا ${faPrice(max)}`;
    req.budgetId = "custom";
    req.customBudget = { id: "custom", label, min: min ?? 0, max };
  }
  // Only ids the desk knows; anything else leaves the priority unset (a balanced view).
  if (cat && PRIORITIES[cat].some((p) => p.id === b.priority)) req.priorityId = b.priority as string;
  return req;
}

export function bridge(e: AgentEvent): Action[] {
  if (e.event === "token") return [{ type: "AGENT_TOKEN", text: e.data.text }];
  if (e.event === "done") return [{ type: "AGENT_DONE", sessionId: e.data.session_id ?? null }];
  if (e.event !== "block") return [];
  const b = e.data;
  switch (b.type) {
    case "ask":
      return [{
        type: "AGENT_MSG",
        msg: { from: "assistant", text: b.question, chips: (b.options as string[]).map((o) => ({ id: `agent:${o}`, label: o })) },
      }];
    case "desk":
      return [{ type: "SET_REQ", req: deskReq(b) }, { type: "GO", stage: "products" }];
    case "shop_cards":
      return b.offer_ids?.length
        ? [{ type: "AGENT_MSG", msg: { from: "assistant", text: "", shopCards: { offerIds: b.offer_ids.slice(0, 3), why: b.why ?? {} } } }]
        : [];
    default:
      // ponytail: price_check and route blocks in chat show only the say text; cards for them come with the redesign.
      return [];
  }
}

type Stream = (body: ChatBody, signal: AbortSignal) => AsyncIterable<AgentEvent>;

/** One consult turn. The actions are applied together at `done`, so a fallback never leaves half a turn behind. */
export async function consult(body: ChatBody, onStatus: (text: string) => void, stream: Stream = streamChat, stallMs = STALL_MS): Promise<Action[]> {
  const ctl = new AbortController();
  let timer: ReturnType<typeof setTimeout> | undefined;
  const arm = () => {
    clearTimeout(timer);
    timer = setTimeout(() => ctl.abort(), stallMs);
  };
  const actions: Action[] = [{ type: "CHAT_USER", text: body.text }];
  try {
    arm();
    for await (const e of stream(body, ctl.signal)) {
      arm();
      if (e.event === "error") break;
      if (e.event === "status") onStatus(e.data.text);
      actions.push(...bridge(e));
      if (e.event === "done") return actions;
    }
  } catch {
    /* stall, network or parse failure → fallback below */
  } finally {
    clearTimeout(timer);
    ctl.abort(); // closes the stream when we stopped early
  }
  return [{ type: "CHAT_TEXT", text: body.text }, { type: "AGENT_OFFLINE" }];
}
