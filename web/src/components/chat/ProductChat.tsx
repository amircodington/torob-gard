"use client";

import { useRouter } from "next/navigation";
import { useEffect, useReducer, useRef, useState } from "react";
import { MessageCircleQuestion } from "lucide-react";
import { consult } from "../../state/agentBridge";
import { productChat, productChatStart } from "../../state/productChat";
import { newSessionId, type Chip } from "../../state/session";
import { Btn } from "../ui/Btn";
import { Sheet } from "../ui/Sheet";
import { Bubble, Typing } from "./Bubble";
import { Chips } from "./Chips";
import { Composer } from "./Composer";
import { ShopCards } from "./ShopCards";

const STARTERS = ["کجا ارزون‌تر پیداش می‌کنم؟", "نقطه‌ی ضعفش چیه؟", "یه مدل مشابه ارزون‌تر هم هست؟"];

/** «درباره‌ی این محصول بپرس»: the agent with this product in its context; it can still search the rest.
 *  Its own agent session (saved to a logged-in user's history like any chat), not the consult's. */
export function ProductChat({ productId, title }: { productId: string; title: string }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [s, dispatch] = useReducer(productChat, null, () => productChatStart(newSessionId()));
  const [pending, setPending] = useState<{ text: string; status: string } | null>(null);
  const turn = useRef<AbortController | null>(null);
  const end = useRef<HTMLDivElement>(null);
  useEffect(() => () => turn.current?.abort(), []);
  useEffect(() => {
    end.current?.scrollIntoView({ block: "end", behavior: "smooth" }); // returns a Promise in new browsers: not a cleanup
  }, [s.msgs.length, pending]);

  const send = async (raw: string) => {
    const text = raw.trim();
    if (!text || pending) return;
    setPending({ text, status: "" });
    const ctl = (turn.current = new AbortController());
    const body = { session_id: s.sessionId, text, context: { req: null, anchor: null, stage: "product", product_id: productId } };
    const actions = await consult(body, (status) => !ctl.signal.aborted && setPending({ text, status }), undefined, undefined, { signal: ctl.signal });
    if (ctl.signal.aborted) return;
    actions.forEach(dispatch);
    setPending(null);
  };
  const pick = (chip: Chip) => send(chip.label);
  const shown = pending ? [...s.msgs, { from: "user" as const, text: pending.text }] : s.msgs;

  return (
    <>
      <Btn variant="ghost" icon={MessageCircleQuestion} iconClass="hover-wiggle" onClick={() => setOpen(true)} className="w-full md:w-auto">
        درباره‌ی این محصول بپرس
      </Btn>
      <Sheet open={open} onClose={() => setOpen(false)} labelledby="product-chat-title" side="bottom" className="lg:max-w-2xl">
        <div className="pe-12">
          <h2 id="product-chat-title" className="text-[20px] leading-8 font-extrabold">درباره‌ی این محصول بپرس</h2>
          <p className="mt-1 line-clamp-2 text-[13px] leading-6 text-on-dark/70">{title}</p>
        </div>
        <div className="mt-4 flex max-h-[55dvh] min-h-40 flex-col gap-3 overflow-y-auto pb-2" aria-live="polite">
          {shown.length === 0 && (
            <div className="flex flex-wrap gap-2">
              {STARTERS.map((q) => (
                <button key={q} type="button" onClick={() => send(q)} className="min-h-11 rounded-pill bg-white/10 px-4 text-[14px] font-semibold text-on-dark press hover:bg-white/15 focus-visible:outline-2 focus-visible:outline-focus">
                  {q}
                </button>
              ))}
            </div>
          )}
          {shown.map((m, i) => (
            <div key={i} className="flex flex-col gap-2">
              {m.text && <Bubble from={m.from}>{m.text}</Bubble>}
              {"shopCards" in m && m.shopCards && (
                <div className="rounded-lg bg-paper p-2 text-ink">
                  <ShopCards {...m.shopCards} onOpen={(row) => router.push(`/radar/${row.offer.productId}`)} />
                </div>
              )}
              {"chips" in m && m.chips && (
                <Chips chips={m.chips} selectedLabel={shown[i + 1]?.from === "user" ? shown[i + 1].text : undefined} disabled={i !== shown.length - 1 || !!pending} onPick={pick} />
              )}
            </div>
          ))}
          {pending && <Typing status={pending.status} />}
          <div ref={end} />
        </div>
        <div className="mt-3">
          <Composer onSend={send} disabled={!!pending} placeholder="مثلاً: گارانتیش چطوره؟" label="سوالت درباره‌ی این محصول" />
        </div>
      </Sheet>
    </>
  );
}
