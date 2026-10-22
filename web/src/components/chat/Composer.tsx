"use client";

import { useState } from "react";
import { SendHorizontal } from "lucide-react";

/** `disabled` (a turn in flight): typing goes on, sending waits; the draft is kept. */
export function Composer({ onSend, disabled = false }: { onSend: (text: string) => void; disabled?: boolean }) {
  const [draft, setDraft] = useState("");
  const send = () => {
    if (disabled || !draft.trim()) return;
    onSend(draft);
    setDraft("");
  };
  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        send();
      }}
      className="flex items-end gap-2 rounded-pill bg-panel p-1.5 ps-5"
    >
      <textarea
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter" && !e.shiftKey && !e.nativeEvent.isComposing) {
            e.preventDefault();
            send();
          }
        }}
        rows={1}
        enterKeyHint="send"
        placeholder="چی می‌خوای بخری؟"
        aria-label="نیاز خرید تو"
        // 16px keeps iOS from zooming the page on focus.
        className="max-h-28 min-h-11 flex-1 resize-none bg-transparent py-2.5 text-[16px] leading-6 text-on-dark outline-none placeholder:text-white/50"
      />
      <button
        type="submit"
        disabled={disabled || !draft.trim()}
        aria-label="ارسال"
        className="grid h-11 w-11 shrink-0 place-items-center rounded-full bg-orange text-on-orange transition-transform focus-visible:outline-2 focus-visible:outline-focus active:scale-95 disabled:opacity-50"
      >
        <SendHorizontal className="flip-rtl h-5 w-5" />
      </button>
    </form>
  );
}
