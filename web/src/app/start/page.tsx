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

  const lastChipMsgId = state.chat.findLast((m) => m.from === "assistant" && m.chips?.length)?.id;

  return (
    <main className="mx-auto flex min-h-[calc(100dvh-60px)] max-w-md flex-col px-4">
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
        <div ref={end} />
      </div>

      <div className="sticky bottom-0 -mx-4 mt-4 flex flex-col gap-1 px-4 pb-[max(12px,env(safe-area-inset-bottom))] pt-2">
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
    <JourneyShell>
      <Consult />
    </JourneyShell>
  );
}
