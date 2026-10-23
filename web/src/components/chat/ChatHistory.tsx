"use client";

import { useEffect, useState } from "react";
import { ChevronLeft, History } from "lucide-react";
import { api } from "../../lib/api";
import { faNum } from "../../lib/fa";
import type { ChatSummary } from "../../lib/types";

const day = new Intl.DateTimeFormat("fa-IR", { month: "long", day: "numeric" });

/** «گفتگوهای قبلی»: the logged-in user's saved agent chats; nothing at all for a guest or on a fetch error. */
export function ChatHistory({ current, onOpen }: { current: string | null; onOpen: (id: string) => void }) {
  const [chats, setChats] = useState<ChatSummary[]>([]);
  useEffect(() => {
    api.chats().then(setChats, () => setChats([]));
  }, [current]);
  const others = chats.filter((c) => c.id !== current);
  if (!others.length) return null;
  return (
    <details className="group mt-3 rounded-lg bg-surface shadow-card">
      <summary className="flex min-h-11 cursor-pointer list-none items-center gap-2 px-4 text-[14px] font-bold text-ink focus-visible:outline-2 focus-visible:outline-focus">
        <History aria-hidden className="size-4 text-orange-deep" />
        گفتگوهای قبلی
        <span className="tabular text-ink-muted">({faNum(others.length)})</span>
        <ChevronLeft aria-hidden className="ms-auto size-4 transition-transform duration-200 group-open:-rotate-90" />
      </summary>
      <ul className="flex max-h-72 flex-col overflow-y-auto px-2 pb-2">
        {others.map((c) => (
          <li key={c.id}>
            <button
              type="button"
              onClick={() => onOpen(c.id)}
              className="flex min-h-11 w-full items-center gap-3 rounded-md px-2 py-2 text-start press hover:bg-surface-tint focus-visible:outline-2 focus-visible:outline-focus"
            >
              <span className="min-w-0 flex-1 truncate text-[14px] font-semibold">{c.title || "گفتگو"}</span>
              <span className="shrink-0 text-[12px] text-ink-muted">{day.format(new Date(c.lastAt))}</span>
            </button>
          </li>
        ))}
      </ul>
    </details>
  );
}
