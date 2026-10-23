import type { CSSProperties, ReactNode } from "react";
import { Mascot } from "../Mascot";
import { Dots } from "../ui/Loader";

// Each bubble enters once on mount (.bubble-in): the user's from the start side, the assistant's from the end.
// `thinking`: the avatar is the think radish (the whole character, not the round icon tile) while a turn is in flight.
export function Bubble({ from, children, thinking }: { from: "assistant" | "user"; children: ReactNode; thinking?: boolean }) {
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
      {/* one 40 px box for both, so the bubble's edge stays put when the answer replaces the typing bubble */}
      <span className={`pop-in size-10 shrink-0 ${thinking ? "" : "overflow-hidden rounded-full"}`}>
        <Mascot pose={thinking ? "think" : "icon"} className="size-10" />
      </span>
    </div>
  );
}

/** The agent's turn in flight: the think radish, typing dots and its latest real status line (no fake streaming). */
export function Typing({ status }: { status: string }) {
  return (
    <Bubble from="assistant" thinking>
      <span className="flex items-center gap-2.5">
        <Dots />
        {/* keyed: each new status fades in, so a long wait reads as progress; the fallback keeps the live region from being silent */}
        <span key={status} className="animate-fade text-ink-muted">
          {status || "دارم فکر می‌کنم…"}
        </span>
      </span>
    </Bubble>
  );
}
