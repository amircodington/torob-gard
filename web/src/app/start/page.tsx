"use client";

import { useEffect, useRef, useState } from "react";
import { ArrowRight, MessageSquarePlus } from "lucide-react";
import { Bubble, Typing } from "../../components/chat/Bubble";
import { Chips } from "../../components/chat/Chips";
import { Composer } from "../../components/chat/Composer";
import { ConsultFrame } from "../../components/chat/ConsultFrame";
import { ReqSummary } from "../../components/chat/ReqSummary";
import { ShopCards } from "../../components/chat/ShopCards";
import { ChatHistory } from "../../components/chat/ChatHistory";
import { api } from "../../lib/api";
import { Mascot } from "../../components/Mascot";
import { JourneyShell } from "../../components/JourneyShell";
import { consult, reopenChat } from "../../state/agentBridge";
import { agentNeed, resetStorage, useSession, type Chip, type Msg } from "../../state/session";

function Consult() {
  const { state, dispatch } = useSession();
  const end = useRef<HTMLDivElement>(null);
  // The agent's turn in flight: the user's text and the latest status line (not in the session until done).
  const [turnState, setPending] = useState<{ text: string; status: string; epoch: number } | null>(null);
  // a turn from before «شروع دوباره» (an older epoch) is not shown and does not lock the composer
  const pending = turnState?.epoch === state.epoch ? turnState : null;

  // Not when the turn leaves for the desk: the smooth scroll would outlive the page and leave the desk scrolled under the TopBar.
  useEffect(() => {
    if (state.stage !== "consult") return;
    if (state.chat.length > 1 || pending) end.current?.scrollIntoView({ block: "end", behavior: "smooth" });
  }, [state.chat.length, pending, state.stage]);

  // «شروع دوباره» (RESET bumps the epoch) cancels the turn in flight; its late answer is dropped below.
  const turn = useRef<AbortController | null>(null);
  useEffect(() => () => turn.current?.abort(), [state.epoch]);

  const send = async (raw: string) => {
    const text = raw.trim();
    if (!text || pending) return;
    const epoch = state.epoch;
    setPending({ text, status: "", epoch });
    const ctl = (turn.current = new AbortController());
    const body = { session_id: state.agentSessionId ?? undefined, text, context: { req: agentNeed(state.req), anchor: null, stage: "consult" } };
    const actions = await consult(body, (status) => !ctl.signal.aborted && setPending({ text, status, epoch }), undefined, undefined, { signal: ctl.signal });
    if (ctl.signal.aborted) return;
    actions.forEach(dispatch);
    setPending(null);
  };

  // A saved chat (the history list, or /me's link: /start?chat=<id>) replaces this one; the agent keeps its session.
  const open = (id: string) =>
    api.chat(id).then((msgs) => {
      turn.current?.abort();
      reopenChat(id, msgs).forEach(dispatch);
    }, () => undefined);
  useEffect(() => {
    const id = new URLSearchParams(window.location.search).get("chat");
    if (!id) return;
    window.history.replaceState(null, "", "/start");
    open(id);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps -- once, on arrival

  const pick = (chip: Chip) => (chip.id.startsWith("agent:") ? send(chip.label) : dispatch({ type: "CHAT_CHIP", chip }));

  // A reverse loop, not findLast: older Android webviews lack it.
  let lastChipMsgId: number | undefined;
  for (let i = state.chat.length - 1; i >= 0; i--) {
    const m = state.chat[i];
    if (m.from === "assistant" && m.chips?.length) {
      lastChipMsgId = m.id;
      break;
    }
  }

  return (
    <main className="page flex min-h-[calc(100dvh-60px)] flex-col pt-2">
      <ConsultFrame aside={<ReqSummary />}>
      {/* Phone/md: the intro radish on its phone beside the title; lg shows it in the summary rail instead. */}
      <div className="mt-4 flex items-start gap-3">
        <div className="min-w-0 flex-1">
          <h1 data-page-head className="animate-rise text-[28px] leading-[40px]">
            <span className="font-light">مشاوره‌ی </span>
            <span className="font-extrabold">خرید</span>
          </h1>
          <p data-page-head className="animate-rise text-[15px] leading-6 text-ink-muted">چند سوال کوتاه، بعد سه گزینه با دلیل.</p>
        </div>
        <Mascot pose="phone" react="pop" className="size-16 lg:hidden" />
      </div>
      {/* The TopBar's ↻ is an unlabelled icon; once a conversation exists, a labelled way out too. */}
      {(state.chat.length > 1 || pending) && (
        <button
          type="button"
          onClick={() => {
            resetStorage();
            dispatch({ type: "RESET" });
          }}
          className="mt-3 inline-flex min-h-11 items-center gap-2 self-start rounded-pill bg-surface-tint px-4 text-[14px] font-bold text-ink lift press focus-visible:outline-2 focus-visible:outline-focus"
        >
          <MessageSquarePlus aria-hidden className="hover-hop size-4" />
          گفتگوی جدید
        </button>
      )}
      <ChatHistory current={state.agentSessionId} onOpen={open} />
      {state.agentOffline && (
        <p role="status" className="mt-3 rounded-md bg-surface-tint px-4 py-2 text-[13px] font-semibold leading-5 text-ink">
          دستیار هوشمند موقتاً در دسترس نیست
        </p>
      )}

      <div className="mt-5 flex flex-1 flex-col gap-3" aria-live="polite">
        {/* Index keys: the pending user bubble becomes the session's one in place, so it does not enter twice. */}
        {(pending ? [...state.chat, { id: -1, from: "user", text: pending.text } as Msg] : state.chat).map((m, i, list) => (
          <div key={i} className="flex flex-col gap-2">
            {m.text && <Bubble from={m.from}>{m.text}</Bubble>}
            {m.shopCards && <ShopCards {...m.shopCards} />}
            {m.chips && (
              <Chips
                chips={m.chips}
                selectedLabel={list[i + 1]?.from === "user" ? list[i + 1].text : undefined}
                disabled={m.id !== lastChipMsgId || !!pending}
                onPick={pick}
              />
            )}
          </div>
        ))}
        {pending && <Typing status={pending.status} />}
        {/* scroll-margin ≈ the sticky composer's height, so scrolling to the end keeps the last bubble above it */}
        <div ref={end} className="scroll-mb-36" />
      </div>

      <div className="sticky bottom-0 -mx-4 mt-4 flex flex-col gap-1 bg-paper/90 px-4 backdrop-blur-md md:-mx-6 md:px-6 lg:-mx-8 lg:px-8 pb-[max(12px,env(safe-area-inset-bottom))] pt-2">
        {state.req.category && (
          <button
            type="button"
            onClick={() => dispatch({ type: "GO", stage: "products" })}
            className="inline-flex min-h-11 items-center gap-1 self-center rounded-pill px-4 text-[15px] lg:hidden font-bold text-orange-deep press hover:bg-orange-tint focus-visible:outline-2 focus-visible:outline-focus"
          >
            بدون سوال بیشتر، نمایش گزینه‌ها
            <ArrowRight aria-hidden className="flip-rtl nudge size-4" />
          </button>
        )}
        <Composer onSend={send} disabled={!!pending} />
      </div>
      </ConsultFrame>
    </main>
  );
}

export default function StartPage() {
  return (
    <JourneyShell stage="consult">
      <Consult />
    </JourneyShell>
  );
}
