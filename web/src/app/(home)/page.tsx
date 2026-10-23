import { LifeBuoy, MessagesSquare, Radar, Scale, Sparkles } from "lucide-react";
import { SiteHeader } from "../../components/SiteHeader";
import { ClosingCta } from "../../components/landing/ClosingCta";
import { Faq } from "../../components/landing/Faq";
import { Hero } from "../../components/landing/Hero";
import { Honesty } from "../../components/landing/Honesty";
import { HowItWorks } from "../../components/landing/HowItWorks";
import { LiveNumbers } from "../../components/landing/LiveNumbers";
import { PasazhStrip } from "../../components/landing/PasazhStrip";
import { Reveal } from "../../components/landing/Reveal";
import { SectionHead } from "../../components/landing/SectionHead";
import { api } from "../../lib/api";

// Copy from the prototype's VALUE_PROPS (Consult.tsx).
const VALUE_PROPS = [
  { t: "اول نیازت رو می‌فهمه", d: "با چند پرسش کوتاه، نه فرم طولانی", icon: MessagesSquare },
  { t: "مدل مناسب رو با دلیل پیشنهاد می‌ده", d: "سه استراتژی: اقتصادی، متعادل، امکانات بیشتر", icon: Scale },
  { t: "نزدیک‌ترین فروشگاه رو ردیاب می‌کنه", d: "قیمت ثبت‌شده + وضعیت موجودی، صادقانه", icon: Radar },
  { t: "اگه خرید گیر کرد، پلن B داره", d: "بازیابی هوشمند بدون از دست رفتن نیازهات", icon: LifeBuoy },
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
    <>
      <SiteHeader />
      {/* Bands (Redesign 2): each a full-bleed ground that overlaps the one above with a curved top. */}
      <main className="flex flex-col">
        <Hero />
        <section className="band bg-paper">
          <div className="page">
            <SectionHead icon={Sparkles} title={<>یه دوست که <span className="font-extrabold">بازار رو می‌شناسه</span></>} sub="می‌گم کجا بری، و چرا." />
            <ul data-reveal className="mt-6 grid gap-3 md:grid-cols-2 lg:mt-8 lg:grid-cols-4 lg:gap-4">
              {VALUE_PROPS.map(({ t, d, icon: Icon }) => (
                <li key={t} className="lift flex items-start gap-4 rounded-lg bg-surface p-5 shadow-card lg:flex-col lg:gap-3">
                  <span className="grid size-11 shrink-0 place-items-center rounded-full bg-orange-tint">
                    <Icon aria-hidden className="size-5" />
                  </span>
                  <span>
                    <span className="block text-[15px] leading-6 font-extrabold">{t}</span>
                    <span className="block text-[15px] leading-6 text-ink-muted">{d}</span>
                  </span>
                </li>
              ))}
            </ul>
          </div>
        </section>
        <HowItWorks />
        <LiveNumbers stats={live?.stats ?? null} priceDaysAgo={live?.priceDaysAgo ?? null} />
        <PasazhStrip venues={live?.venues ?? []} />
        <Honesty />
        <Faq />
        <ClosingCta />
      </main>
      <Reveal />
    </>
  );
}
