import { ArrowLeft, Compass, MapPin, SendHorizontal, Sparkles, Undo2, Zap } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { cn } from "../utils/cn";
import { useSession } from "../state/session";
import { TorobGardMascot, MascotAvatar } from "../components/Mascot";
import { Btn, Chip, DemoTag } from "../components/ui";

const EXAMPLE = "یه گوشی برای عکاسی و دانشگاه می‌خوام";

const VALUE_PROPS = [
  { Icon: Sparkles, t: "اول نیازت رو می‌فهمه", d: "با چند پرسش کوتاه، نه فرم طولانی" },
  { Icon: Compass, t: "مدل مناسب رو با دلیل پیشنهاد می‌ده", d: "سه استراتژی: اقتصادی، متعادل، امکانات بیشتر" },
  { Icon: MapPin, t: "نزدیک‌ترین فروشگاه رو ردیاب می‌کنه", d: "قیمت ثبت‌شده + وضعیت موجودی، صادقانه" },
  { Icon: Zap, t: "اگه خرید گیر کرد، پلن B داره", d: "بازیابی هوشمند بدون از دست رفتن نیازهات" },
];

export function Consult() {
  const { state, dispatch } = useSession();
  const [draft, setDraft] = useState("");
  const scroller = useRef<HTMLDivElement>(null);

  useEffect(() => {
    scroller.current?.scrollTo({ top: scroller.current.scrollHeight, behavior: "smooth" });
  }, [state.chat.length]);

  const send = (text: string) => {
    if (!text.trim()) return;
    dispatch({ type: "CHAT_TEXT", text });
    setDraft("");
  };

  const lastChipMsgId = [...state.chat].reverse().find((m) => m.from === "assistant" && m.chips?.length)?.id;

  return (
    <div className="mx-auto grid max-w-6xl gap-5 px-3 py-5 sm:px-5 md:grid-cols-[1.05fr_1fr] md:gap-8 md:py-8">
      {/* ------------------------- hero ------------------------- */}
      <section className="flex flex-col gap-4 md:sticky md:top-20 md:self-start">
        <div className="anim-rise flex items-start gap-4">
          <TorobGardMascot
            pose="wave"
            float
            className="h-32 w-28 shrink-0 sm:h-40 sm:w-36 md:h-48 md:w-44"
            alt="ترب‌گرد، جوانه‌ی قرمز با کوله‌پشتی و قطب‌نما، در حال سلام کردن"
          />
          <div className="pt-2 md:pt-6">
            <div className="flex flex-wrap items-center gap-2">
              <span className="rounded-full bg-brand px-2.5 py-1 text-[10px] font-extrabold text-white">دستیار خرید حضوری ترب</span>
              <DemoTag />
            </div>
            <h1 className="mt-2.5 text-[22px] font-black leading-[1.4] sm:text-3xl md:text-[34px] md:leading-[1.35]">
              بیا با هم خریدِ خوب رو
              <br />
              پیدا کنیم!
            </h1>
            <p className="mt-2 text-[13px] font-medium leading-relaxed text-sub">
              «از <span className="font-bold text-brand-deep">چی</span> بخرم تا از <span className="font-bold text-brand-deep">کجا</span> بخرم!»
              <br />
              از مشورت انتخاب مدل تا پیدا کردن فروشگاه‌ی که واقعا می‌ارزه سر بزنی.
            </p>
          </div>
        </div>

        <ul className="grid gap-2 sm:grid-cols-2">
          {VALUE_PROPS.map((v, i) => (
            <li
              key={v.t}
              className="anim-rise flex items-start gap-2.5 rounded-2xl border border-line bg-white p-3 shadow-card"
              style={{ animationDelay: `${80 + i * 60}ms` }}
            >
              <span className="grid h-8 w-8 shrink-0 place-items-center rounded-xl bg-brand-tint text-brand-deep">
                <v.Icon className="h-4 w-4" />
              </span>
              <span>
                <span className="block text-xs font-extrabold leading-relaxed">{v.t}</span>
                <span className="block text-[10px] leading-relaxed text-sub">{v.d}</span>
              </span>
            </li>
          ))}
        </ul>

        <div className="anim-rise flex flex-wrap items-center gap-2 rounded-2xl border border-dashed border-line bg-white/60 p-3" style={{ animationDelay: "340ms" }}>
          <Btn size="sm" variant="outline" icon={Zap} onClick={() => dispatch({ type: "SEED_DEMO" })}>
            شروع سریع با سناریوی آماده
          </Btn>
          <p className="flex-1 text-[10px] leading-relaxed text-sub">
            برای ارائه: مکالمه‌ی نمونه (گوشی برای عکاسی و دانشگاه) را یکجا اجرا می‌کند؛ بقیه‌ی مسیر کاملا تعاملی می‌ماند.
          </p>
        </div>
      </section>

      {/* ------------------------- chat ------------------------- */}
      <section className="anim-rise flex min-h-[70dvh] flex-col overflow-hidden rounded-[26px] border border-line bg-white shadow-card md:min-h-[560px]" style={{ animationDelay: "120ms" }}>
        <div className="flex items-center gap-2.5 border-b border-line bg-cream/60 px-4 py-3">
          <MascotAvatar className="h-9 w-9" />
          <div className="flex-1 leading-tight">
            <p className="text-sm font-extrabold">مشاوره‌ی خرید</p>
            <p className="text-[10px] font-medium text-mint">آنلاین — پاسخ فوری، بدون فرم خشک</p>
          </div>
          <span className="text-[10px] font-bold text-faint">{state.req.category ? "در حال جمع‌بندی نیازها" : "مرحله‌ی کشف نیاز"}</span>
        </div>

        <div ref={scroller} className="nice-scroll flex flex-1 flex-col gap-3 overflow-y-auto bg-cream/40 p-4">
          {state.chat.map((m) => (
            <div key={m.id} className={cn("flex flex-col", m.from === "user" ? "items-start" : "items-end")}>
              <div className={cn("flex max-w-[88%] items-end gap-2", m.from === "user" ? "flex-row" : "flex-row-reverse")}>
                {m.from === "assistant" && <MascotAvatar className="mb-0.5 h-7 w-7" />}
                <div
                  className={cn(
                    "anim-rise whitespace-pre-line rounded-3xl px-4 py-3 text-[13px] font-medium leading-[1.9]",
                    m.from === "user"
                      ? "rounded-bl-md bg-brand text-white"
                      : "rounded-br-md border border-line bg-white text-ink shadow-card"
                  )}
                >
                  {m.text}
                </div>
              </div>
              {m.chips && (
                <div className="mt-2 flex max-w-[94%] flex-wrap gap-1.5 self-end ps-9">
                  {m.chips.map((c) => (
                    <Chip
                      key={c.id}
                      label={c.label}
                      hint={c.hint}
                      disabled={m.id !== lastChipMsgId}
                      onClick={() => dispatch({ type: "CHAT_CHIP", chip: c })}
                    />
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>

        <div className="border-t border-line bg-white p-3">
          <button
            type="button"
            onClick={() => setDraft(EXAMPLE)}
            className="focusable mb-2 flex w-full items-center gap-1.5 rounded-xl bg-cream px-3 py-2 text-right text-[11px] font-semibold text-sub transition hover:text-brand-deep"
          >
            <Undo2 className="h-3.5 w-3.5 shrink-0" />
            {EXAMPLE}
          </button>
          <div className="flex items-end gap-2">
            <textarea
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  send(draft);
                }
              }}
              rows={1}
              placeholder="چی می‌خوای بخری؟ مثلا: یه گوشی برای عکاسی و دانشگاه…"
              aria-label="نیاز خرید تو"
              className="focusable nice-scroll max-h-28 flex-1 resize-none rounded-2xl border border-line bg-cream/60 px-3.5 py-3 text-[13px] font-medium leading-relaxed placeholder:text-faint"
            />
            <button
              type="button"
              onClick={() => send(draft)}
              disabled={!draft.trim()}
              aria-label="ارسال"
              className="focusable grid h-11 w-11 shrink-0 place-items-center rounded-2xl bg-brand text-white shadow-[0_6px_16px_-6px_rgb(217_45_43/0.7)] transition hover:bg-brand-deep active:scale-95 disabled:opacity-40"
            >
              <SendHorizontal className="h-4.5 w-4.5 -scale-x-100" />
            </button>
          </div>
          {state.req.category && (
            <Btn
              variant="ghost"
              size="sm"
              className="mt-2 w-full text-brand-deep"
              icon={ArrowLeft}
              onClick={() => dispatch({ type: "GO", stage: "products" })}
            >
              بدون سوال بیشتر، نمایش گزینه‌ها ←
            </Btn>
          )}
        </div>
      </section>
    </div>
  );
}
