import { Route } from "lucide-react";
import { faNum } from "../../lib/fa";
import { Mascot, type MascotPose } from "../Mascot";
import { SectionHead } from "./SectionHead";

// The same steps as the top bar; each with the mascot doing it.
const STEPS: { t: string; d: string; pose: MascotPose }[] = [
  { t: "مشاوره", d: "چند سوال کوتاه درباره‌ی نیاز و بودجه‌ت.", pose: "phone" },
  { t: "میز تصمیم", d: "سه مدل با دلیل: اقتصادی، متعادل، امکانات بیشتر.", pose: "think" },
  { t: "رادار فروشگاه", d: "مغازه‌هایی که برای این مدل قیمت ثبت کردن، با تاریخ قیمت.", pose: "search" },
  { t: "پلن B", d: "مغازه بسته بود یا جنس نداشت؟ گزینه‌ی بعدی آماده‌ست.", pose: "point" },
  { t: "چک‌لیست", d: "طبقه، واحد و قیمت، تو یه صفحه برای راه.", pose: "walk" },
];

export function HowItWorks() {
  return (
    <section id="how" className="band scroll-mt-16 bg-surface">
      <div className="page">
        <SectionHead
          icon={Route}
          title={<>چطور <span className="font-extrabold">کار می‌کنه؟</span></>}
          sub="از اولین سوال تا جلوی ویترین مغازه، پنج قدم."
        />
        <ol data-reveal className="mt-6 grid gap-3 sm:grid-cols-2 lg:mt-8 lg:grid-cols-5 lg:gap-4">
          {STEPS.map(({ t, d, pose }, i) => (
            <li key={t} className="lift flex items-center gap-4 rounded-lg bg-surface-tint p-4 pe-5 lg:flex-col lg:items-start lg:gap-3 lg:p-5">
              <Mascot pose={pose} loading="lazy" className="size-20 lg:-mt-2 lg:size-28 lg:self-center" />
              <span className="min-w-0">
                <span className="inline-block rounded-pill bg-panel px-2.5 text-[11px] leading-5 font-bold text-on-dark tabular">مرحله‌ی {faNum(i + 1)}</span>
                <span className="mt-1 block text-[17px] leading-7 font-extrabold">{t}</span>
                <span className="block text-[15px] leading-6 text-ink-muted">{d}</span>
              </span>
            </li>
          ))}
        </ol>
      </div>
    </section>
  );
}
