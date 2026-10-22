import type { ReactNode } from "react";
import { Mascot } from "../Mascot";

export function Bubble({ from, children }: { from: "assistant" | "user"; children: ReactNode }) {
  if (from === "user")
    return (
      <div className="max-w-[85%] self-start whitespace-pre-line rounded-lg rounded-ss-sm bg-orange px-4 py-3 text-[15px] font-bold leading-6 text-on-orange">
        {children}
      </div>
    );
  return (
    <div className="flex max-w-[92%] items-end gap-2 self-end">
      <div className="whitespace-pre-line rounded-lg rounded-ee-sm bg-surface px-4 py-3 text-[15px] leading-6 text-ink shadow-card">
        {children}
      </div>
      <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-surface-tint">
        <Mascot pose="icon" className="h-7 w-7" />
      </span>
    </div>
  );
}
