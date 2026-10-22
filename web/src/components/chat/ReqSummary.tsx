"use client";

import { ArrowRight } from "lucide-react";
import { useSession } from "../../state/session";
import { ReqChips } from "../desk/ReqChips";
import { Mascot } from "../Mascot";
import { Btn } from "../ui/Btn";

/** The desktop rail: what the chat has learned so far, and the skip to the options. Reads the session only. */
export function ReqSummary() {
  const { state, dispatch } = useSession();
  return (
    <div className="flex flex-col items-center gap-4 rounded-lg bg-surface p-6 text-center shadow-card">
      <Mascot pose="idle" className="size-28" />
      <h2 className="text-[17px] font-bold leading-7">نیاز تو تا اینجا</h2>
      <ReqChips req={state.req} className="justify-center" />
      {state.req.category && (
        <Btn variant="ghost" icon={ArrowRight} iconEnd className="w-full" onClick={() => dispatch({ type: "GO", stage: "products" })}>
          بدون سوال بیشتر، نمایش گزینه‌ها
        </Btn>
      )}
    </div>
  );
}
