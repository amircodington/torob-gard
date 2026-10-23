import type { CSSProperties, ReactNode } from "react";
import { Mascot } from "../Mascot";

// Each bubble enters once on mount (.bubble-in): the user's from the start side, the assistant's from the end.
export function Bubble({ from, children }: { from: "assistant" | "user"; children: ReactNode }) {
  if (from === "user")
    return (
      <div
        style={{ "--from": 1 } as CSSProperties}
        className="bubble-in max-w-[85%] self-start whitespace-pre-line rounded-lg rounded-ss-sm bg-orange px-4 py-3 text-[15px] font-bold leading-6 text-on-orange"
      >
        {children}
      </div>
    );
  return (
    <div style={{ "--from": -1 } as CSSProperties} className="bubble-in flex max-w-[92%] items-end gap-2 self-end">
      <div className="whitespace-pre-line rounded-lg rounded-ee-sm bg-surface px-4 py-3 text-[15px] leading-6 text-ink shadow-card">
        {children}
      </div>
      <span className="pop-in size-9 shrink-0 overflow-hidden rounded-full">
        <Mascot pose="icon" className="size-full" />
      </span>
    </div>
  );
}

/** The agent's turn in flight: typing dots and its latest real status line (no fake streaming). */
export function Typing({ status }: { status: string }) {
  return (
    <Bubble from="assistant">
      <span className="flex items-center gap-2.5">
        <span aria-hidden className="flex gap-1">
          {[0, 1, 2].map((i) => (
            <span key={i} style={{ animationDelay: `${i * 160}ms` }} className="size-1.5 animate-typing rounded-full bg-orange opacity-40" />
          ))}
        </span>
        {/* keyed: each new status fades in, so a long wait reads as progress; the fallback keeps the live region from being silent */}
        <span key={status} className="animate-fade text-ink-muted">
          {status || "دارم فکر می‌کنم…"}
        </span>
      </span>
    </Bubble>
  );
}
