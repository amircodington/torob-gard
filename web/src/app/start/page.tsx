"use client";

import { useEffect, useRef } from "react";
import { Bubble } from "../../components/chat/Bubble";
import { Chips } from "../../components/chat/Chips";
import { Composer } from "../../components/chat/Composer";
import { JourneyShell } from "../../components/JourneyShell";
import { useSession } from "../../state/session";

function Consult() {
  const { state, dispatch } = useSession();
  const end = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (state.chat.length > 1) end.current?.scrollIntoView({ block: "end", behavior: "smooth" });
  }, [state.chat.length]);

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
      <h1 className="mt-4 text-[28px] leading-[40px]">
        <span className="font-light">مشاوره‌ی </span>
        <span className="font-extrabold">خرید</span>
      </h1>
      <p className="text-[15px] leading-6 text-ink-muted">چند سوال کوتاه، بعد سه گزینه با دلیل.</p>

      <div className="mt-5 flex flex-1 flex-col gap-3" aria-live="polite">
        {state.chat.map((m, i) => (
          <div key={m.id} className="flex flex-col gap-2">
            <Bubble from={m.from}>{m.text}</Bubble>
            {m.chips && (
              <Chips
                chips={m.chips}
                selectedLabel={state.chat[i + 1]?.from === "user" ? state.chat[i + 1].text : undefined}
                disabled={m.id !== lastChipMsgId}
                onPick={(chip) => dispatch({ type: "CHAT_CHIP", chip })}
              />
            )}
          </div>
        ))}
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
        <Composer onSend={(text) => dispatch({ type: "CHAT_TEXT", text })} />
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
