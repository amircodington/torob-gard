"use client";

import { useEffect, useRef, useState } from "react";
import { MessageSquareShare } from "lucide-react";
import { faPriceFull } from "../../lib/fa";
import { simulateSeller, type SellerReply } from "../../lib/sellerSim";
import type { FailReason, OfferRow } from "../../lib/types";
import { Dots } from "../ui/Loader";

const ASK_MS = 1600; // long enough to read «پیام فرستادم»; the reply itself is computed, not awaited

/** Brief step 4: the agent asks the seller for the shopper. Simulated end to end and labelled so on screen. */
export function SellerFollowUp({ row, now, onPlanB }: { row: OfferRow; now: Date; onPlanB: (reason: FailReason) => void }) {
  const [reply, setReply] = useState<SellerReply | "asking" | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout>>(undefined);
  useEffect(() => () => clearTimeout(timer.current), []);
  const { offer, store } = row;

  const ask = () => {
    setReply("asking");
    timer.current = setTimeout(() => setReply(simulateSeller(store.id, offer.productId, offer.priceToman, now)), ASK_MS);
  };

  return (
    <section data-testid="seller-follow-up" className="mt-3 rounded-md bg-panel-2 p-4 text-on-dark">
      <p className="flex items-center gap-2 text-[14px] font-bold">
        <MessageSquareShare aria-hidden className="size-4 text-orange" />
        پیگیری از فروشنده
        <span className="rounded-pill bg-white/15 px-2 py-0.5 text-[11px] font-bold">شبیه‌سازی</span>
      </p>
      <div role="status" className="mt-2 text-[14px] leading-6">
        {reply === null ? (
          <button
            type="button"
            onClick={ask}
            className="inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-md bg-white/10 px-4 text-[15px] font-bold press hover:bg-white/15 focus-visible:outline-2 focus-visible:outline-focus"
          >
            از طرف من بپرس موجوده و قیمتش همینه؟
          </button>
        ) : reply === "asking" ? (
          <span className="inline-flex min-h-11 items-center gap-2 text-on-dark/80">
            <Dots /> پیام فرستادم: «سلام، این مدل موجوده؟ قیمتش همونه که تو ترب زدید؟»
          </span>
        ) : reply.kind === "confirmed" ? (
          <p className="animate-rise">
            <span className="font-bold">فروشنده جواب داد {reply.at}</span> · موجودی تأییدشده ·{" "}
            {reply.delta ? `قیمت ${faPriceFull(reply.delta)} بیشتر از ثبت‌شده: ${faPriceFull(reply.priceToman)}` : "قیمت همون ثبت‌شده"}
          </p>
        ) : (
          <div className="animate-rise">
            <p>
              {reply.kind === "no_answer" ? (
                <span className="font-bold">تا {reply.at} جوابی نیومد</span>
              ) : (
                <>
                  <span className="font-bold">فروشنده جواب داد {reply.at}</span> · این مدل رو الان نداره
                </>
              )}
            </p>
            <button
              type="button"
              onClick={() => onPlanB(reply.kind === "no_answer" ? "no-answer" : "stock")}
              className="mt-2 inline-flex min-h-11 w-full items-center justify-center rounded-md bg-orange px-4 text-[15px] font-bold text-ink press focus-visible:outline-2 focus-visible:outline-focus"
            >
              برو سراغ پلن B
            </button>
          </div>
        )}
      </div>
      <p className="mt-2 text-[12px] leading-5 text-on-dark/60">شبیه‌سازی‌شده: شماره‌های این داده واقعی نیستن و به هیچ فروشنده‌ای پیامی نمی‌ره.</p>
    </section>
  );
}
