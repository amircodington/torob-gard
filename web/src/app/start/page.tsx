"use client";

import { useEffect, useRef, useState } from "react";
import { Bubble } from "../../components/chat/Bubble";
import { Chips } from "../../components/chat/Chips";
import { Composer } from "../../components/chat/Composer";
import { ShopCards } from "../../components/chat/ShopCards";
import { JourneyShell } from "../../components/JourneyShell";
import { consult } from "../../state/agentBridge";
import { useSession, type Chip } from "../../state/session";

function Consult() {
  const { state, dispatch } = useSession();
  const end = useRef<HTMLDivElement>(null);
  // The agent's turn in flight: the user's text and the latest status line (not in the session until done).
  const [pending, setPending] = useState<{ text: string; status: string } | null>(null);

  useEffect(() => {
    if (state.chat.length > 1 || pending) end.current?.scrollIntoView({ block: "end", behavior: "smooth" });
  }, [state.chat.length, pending]);

  const send = async (raw: string) => {
    const text = raw.trim();
    if (!text || pending) return;
    setPending({ text, status: "" });
    const body = { session_id: state.agentSessionId ?? undefined, text, context: { req: state.req, anchor: null, stage: "consult" } };
    const actions = await consult(body, (status) => setPending({ text, status }));
    actions.forEach(dispatch);
    setPending(null);
  };

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
    <main className="mx-auto flex min-h-[calc(100dvh-60px)] max-w-md flex-col px-4 pt-2">
      <h1 data-page-head className="mt-4 animate-rise text-[28px] leading-[40px]">
        <span className="font-light">مشاوره‌ی </span>
        <span className="font-extrabold">خرید</span>
      </h1>
      <p data-page-head className="animate-rise text-[15px] leading-6 text-ink-muted">چند سوال کوتاه، بعد سه گزینه با دلیل.</p>
      {state.agentOffline && (
        <p role="status" className="mt-3 rounded-md bg-surface-tint px-4 py-2 text-[13px] font-semibold leading-5 text-ink">
          دستیار هوشمند موقتاً در دسترس نیست
        </p>
      )}

      <div className="mt-5 flex flex-1 flex-col gap-3" aria-live="polite">
        {state.chat.map((m, i) => (
          <div key={m.id} className="flex flex-col gap-2">
            {m.text && <Bubble from={m.from}>{m.text}</Bubble>}
            {m.shopCards && <ShopCards {...m.shopCards} />}
            {m.chips && (
              <Chips
                chips={m.chips}
                selectedLabel={state.chat[i + 1]?.from === "user" ? state.chat[i + 1].text : undefined}
                disabled={m.id !== lastChipMsgId || !!pending}
                onPick={pick}
              />
            )}
          </div>
        ))}
        {pending && (
          <>
            <Bubble from="user">{pending.text}</Bubble>
            <Bubble from="assistant">
              <span className="text-ink-muted">{pending.status || "…"}</span>
            </Bubble>
          </>
        )}
        {/* scroll-margin ≈ the sticky composer's height, so scrolling to the end keeps the last bubble above it */}
        <div ref={end} className="scroll-mb-36" />
      </div>

      <div className="sticky bottom-0 -mx-4 mt-4 flex flex-col gap-1 bg-paper/90 px-4 backdrop-blur-md pb-[max(12px,env(safe-area-inset-bottom))] pt-2">
        {state.req.category && (
          <button
            type="button"
            onClick={() => dispatch({ type: "GO", stage: "products" })}
            className="min-h-11 self-center rounded-pill px-4 text-[15px] font-bold text-orange-deep focus-visible:outline-2 focus-visible:outline-focus"
          >
            بدون سوال بیشتر، نمایش گزینه‌ها ←
          </button>
        )}
        <Composer onSend={send} disabled={!!pending} />
      </div>
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
