import type { CSSProperties } from "react";
import { ClipboardCheck, LifeBuoy, MessagesSquare, Radar, Scale } from "lucide-react";
import { faNum } from "../../lib/fa";

// The same icons as the top bar's steps.
const STEPS = [
  { t: "مشاوره", d: "چند سوال کوتاه درباره‌ی نیاز و بودجه‌ت.", icon: MessagesSquare },
  { t: "میز تصمیم", d: "سه مدل با دلیل: اقتصادی، متعادل، امکانات بیشتر.", icon: Scale },
  { t: "رادار فروشگاه", d: "مغازه‌هایی که این مدل رو دارن، با قیمت و تاریخش.", icon: Radar },
  { t: "پلن B", d: "مغازه بسته بود یا جنس نداشت؟ گزینه‌ی بعدی آماده‌ست.", icon: LifeBuoy },
  { t: "چک‌لیست", d: "طبقه، واحد و قیمت، تو یه صفحه برای راه.", icon: ClipboardCheck },
];

export function HowItWorks() {
  return (
    <section id="how" className="scroll-mt-20">
      <h2 className="text-[22px] leading-8 font-light">
        چطور <span className="font-extrabold">کار می‌کنه؟</span>
      </h2>
      {/* lg: five columns on a 2px connector through the circle centres (size-14 → 28px). */}
      <ol className="relative mt-4 flex flex-col gap-3 lg:mt-8 lg:grid lg:grid-cols-5 lg:gap-6 lg:before:absolute lg:before:inset-x-[10%] lg:before:top-[27px] lg:before:h-0.5 lg:before:rounded-pill lg:before:bg-orange-tint">
        {STEPS.map(({ t, d, icon: Icon }, i) => (
          <li
            key={t}
            style={{ "--i": i } as CSSProperties}
            className="relative flex animate-rise stagger items-start gap-3 rounded-lg bg-surface p-5 shadow-card lg:flex-col lg:items-center lg:bg-transparent lg:p-0 lg:text-center lg:shadow-none"
          >
            <span className="grid size-10 shrink-0 place-items-center rounded-full bg-surface-tint lg:size-14">
              <Icon aria-hidden className="size-5 lg:size-6" />
            </span>
            <span>
              <span className="block text-[11px] leading-4 font-bold text-ink-muted tabular">مرحله‌ی {faNum(i + 1)}</span>
              <span className="block text-[15px] leading-6 font-extrabold">{t}</span>
              <span className="block text-[15px] leading-6 text-ink-muted">{d}</span>
            </span>
          </li>
        ))}
      </ol>
    </section>
  );
}
