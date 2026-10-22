import { Building2, CalendarClock, Store, Tag } from "lucide-react";
import { faNum } from "../../lib/fa";
import type { Stats } from "../../lib/types";
import { CountUp } from "./CountUp";

// ponytail: plain stat cards; four unrelated counts don't make a bar chart.
export function LiveNumbers({ stats, priceDaysAgo }: { stats: Stats | null; priceDaysAgo: number | null }) {
  const cells = stats && [
    { n: <CountUp value={stats.shops} />, l: "فروشگاه", icon: Store },
    { n: <CountUp value={stats.venues} />, l: "پاساژ", icon: Building2 },
    { n: <CountUp value={stats.offers} />, l: "قیمت ثبت‌شده", icon: Tag },
    // A date, not a count: counting it up would show «۰ روز پیش» on the way.
    {
      n: priceDaysAgo === null ? "—" : `${faNum(priceDaysAgo)} روز پیش`,
      l: priceDaysAgo === null ? "تاریخ قیمت ثبت نشده" : "آخرین قیمت",
      icon: CalendarClock,
    },
  ];
  return (
    <section data-testid="live-numbers">
      <h2 className="text-[22px] leading-8 font-light">
        بازار <span className="font-extrabold">به عدد</span>
      </h2>
      {cells ? (
        <dl className="mt-4 grid grid-cols-2 gap-3 lg:grid-cols-4">
          {cells.map(({ n, l, icon: Icon }) => (
            <div key={l} className="flex flex-col-reverse gap-1 rounded-lg bg-surface p-5 shadow-card">
              <dt className="text-[13px] leading-5 font-semibold text-ink-muted">{l}</dt>
              <dd className="text-[22px] leading-8 font-bold tabular lg:text-[28px] lg:leading-10">{n}</dd>
              <Icon aria-hidden className="mb-2 size-5 text-ink-muted" />
            </div>
          ))}
        </dl>
      ) : (
        <p className="mt-4 rounded-lg bg-surface p-5 text-[15px] leading-6 text-ink-muted shadow-card">آمار در دسترس نیست.</p>
      )}
    </section>
  );
}
