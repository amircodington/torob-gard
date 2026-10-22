import { Faq } from "../components/landing/Faq";
import { Hero } from "../components/landing/Hero";
import { Honesty } from "../components/landing/Honesty";
import { HowItWorks } from "../components/landing/HowItWorks";
import { LiveNumbers } from "../components/landing/LiveNumbers";
import { PasazhStrip } from "../components/landing/PasazhStrip";
import { api } from "../lib/api";

// Copy from the prototype's VALUE_PROPS (Consult.tsx).
const VALUE_PROPS = [
  { t: "اول نیازت رو می‌فهمه", d: "با چند پرسش کوتاه، نه فرم طولانی" },
  { t: "مدل مناسب رو با دلیل پیشنهاد می‌ده", d: "سه استراتژی: اقتصادی، متعادل، امکانات بیشتر" },
  { t: "نزدیک‌ترین فروشگاه رو ردیاب می‌کنه", d: "قیمت ثبت‌شده + وضعیت موجودی، صادقانه" },
  { t: "اگه خرید گیر کرد، پلن B داره", d: "بازیابی هوشمند بدون از دست رفتن نیازهات" },
];

// ISR 1 h. api.ts fetches with no-store (right for the journey); force-cache lets this route cache them.
export const revalidate = 3600;
export const fetchCache = "force-cache";

async function loadLive() {
  // ponytail: same default as the /api rewrite in next.config.ts; set API_URL in prod.
  process.env.API_URL ??= "http://localhost:8000";
  const [stats, venues] = await Promise.all([api.stats(), api.venues(12)]);
  const priceDaysAgo = stats.newestPriceAt
    ? Math.max(0, Math.floor((Date.now() - Date.parse(stats.newestPriceAt)) / 86_400_000))
    : null;
  return { stats, venues, priceDaysAgo };
}

export default async function Home() {
  const live = await loadLive().catch(() => null);
  return (
    <main className="mx-auto flex max-w-md flex-col gap-12 px-4 pb-12">
      <Hero />
      <ul className="grid gap-3">
        {VALUE_PROPS.map((v) => (
          <li key={v.t} className="rounded-lg bg-surface p-5 shadow-card">
            <span className="block text-[15px] leading-6 font-extrabold">{v.t}</span>
            <span className="block text-[15px] leading-6 text-ink-muted">{v.d}</span>
          </li>
        ))}
      </ul>
      <HowItWorks />
      <LiveNumbers stats={live?.stats ?? null} priceDaysAgo={live?.priceDaysAgo ?? null} />
      <PasazhStrip venues={live?.venues ?? []} />
      <Honesty />
      <Faq />
    </main>
  );
}
