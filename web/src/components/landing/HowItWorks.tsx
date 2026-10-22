import { faNum } from "../../lib/fa";

const STEPS = [
  { t: "مشاوره", d: "چند سوال کوتاه درباره‌ی نیاز و بودجه‌ت." },
  { t: "میز تصمیم", d: "سه مدل با دلیل: اقتصادی، متعادل، امکانات بیشتر." },
  { t: "رادار فروشگاه", d: "مغازه‌هایی که این مدل رو دارن، با قیمت و تاریخش." },
  { t: "پلن B", d: "مغازه بسته بود یا جنس نداشت؟ گزینه‌ی بعدی آماده‌ست." },
  { t: "چک‌لیست", d: "طبقه، واحد و قیمت، تو یه صفحه برای راه." },
];

export function HowItWorks() {
  return (
    <section id="how" className="scroll-mt-20">
      <h2 className="text-[22px] leading-8 font-light">
        چطور <span className="font-extrabold">کار می‌کنه؟</span>
      </h2>
      <ol className="mt-4 flex flex-col gap-3">
        {STEPS.map((s, i) => (
          <li key={s.t} className="flex items-start gap-3 rounded-lg bg-surface p-5 shadow-card">
            <span className="grid size-10 shrink-0 place-items-center rounded-full bg-surface-tint text-[17px] font-extrabold tabular">
              {faNum(i + 1)}
            </span>
            <span>
              <span className="block text-[15px] leading-6 font-extrabold">{s.t}</span>
              <span className="block text-[15px] leading-6 text-ink-muted">{s.d}</span>
            </span>
          </li>
        ))}
      </ol>
    </section>
  );
}
