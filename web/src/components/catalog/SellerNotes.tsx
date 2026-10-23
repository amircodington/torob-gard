"use client";

import { useState, type CSSProperties } from "react";
import { NotebookPen, Sparkles } from "lucide-react";
import { api } from "../../lib/api";
import { faNum } from "../../lib/fa";
import { Btn } from "../ui/Btn";
import { Dots } from "../ui/Loader";
import { Section } from "./parts";

type View = { kind: "idle" } | { kind: "busy" } | { kind: "done"; points: string[]; notes: number } | { kind: "failed" };

/** The dataset has no buyer reviews: this sums up what the sellers themselves wrote, and says so. */
export function SellerNotes({ productId, count }: { productId: string; count: number }) {
  const [v, setV] = useState<View>({ kind: "idle" });
  const run = () => {
    setV({ kind: "busy" });
    api.sellerNotes(productId).then(
      (r) => setV(r.points.length ? { kind: "done", ...r } : { kind: "failed" }),
      () => setV({ kind: "failed" }),
    );
  };
  return (
    <Section title="یادداشت فروشنده‌ها" icon={NotebookPen} testId="seller-notes">
      <p className="text-[13px] leading-6 text-ink-muted">
        {faNum(count)} فروشنده درباره‌ی اصالت، گارانتی یا وضعیت کالا چیزی نوشتن. این‌ها حرف خود فروشنده‌هاست، نه نظر خریدارها.
      </p>
      {v.kind === "done" ? (
        <>
          <ul className="mt-3 flex flex-col gap-2">
            {v.points.map((p, i) => (
              <li key={i} style={{ "--i": i } as CSSProperties} className="animate-rise stagger flex gap-2 text-[15px] leading-6">
                <Sparkles aria-hidden className="mt-1 size-4 shrink-0 text-orange" />
                <span>{p}</span>
              </li>
            ))}
          </ul>
          <p className="mt-3 text-[12px] leading-5 text-ink-muted">خلاصه با هوش مصنوعی از یادداشت {faNum(v.notes)} پیشنهاد؛ قبل از خرید از خود فروشنده بپرس.</p>
        </>
      ) : (
        <div className="mt-3" role="status">
          {v.kind === "busy" ? (
            <span className="inline-flex min-h-11 items-center gap-2 text-[14px] text-ink-muted">
              <Dots /> دارم یادداشت‌ها رو می‌خونم…
            </span>
          ) : (
            <>
              <Btn variant="ghost" icon={Sparkles} iconClass="hover-spin" onClick={run} className="w-full md:w-auto">
                {v.kind === "failed" ? "دوباره امتحان کن" : "جمع‌بندی با هوش مصنوعی"}
              </Btn>
              {v.kind === "failed" && <p className="mt-2 text-[13px] text-ink-muted">الان جمع‌بندی نشد؛ یه کم بعد دوباره بزن.</p>}
            </>
          )}
        </div>
      )}
    </Section>
  );
}
