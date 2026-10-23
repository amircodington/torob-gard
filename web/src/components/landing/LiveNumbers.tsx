import { Building2, CalendarClock, ChartNoAxesColumn, Store, Tag } from "lucide-react";
import { faNum } from "../../lib/fa";
import type { Stats } from "../../lib/types";
import { CountUp } from "./CountUp";
import { SectionHead } from "./SectionHead";

// The brand's black-sheet stat cards (panel-2 / brown / plum) on the one dark band.
const GROUNDS = ["bg-panel-2", "bg-panel-brown", "bg-panel-plum", "bg-panel-2"];

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
    <section data-testid="live-numbers" className="band bg-panel text-on-dark">
      <div className="page">
        <SectionHead dark icon={ChartNoAxesColumn} title={<>بازار <span className="font-extrabold">به عدد</span></>} sub="شمارش زنده از داده‌ی ترب/استارکوچ." />
        {cells ? (
          <dl data-reveal className="mt-6 grid grid-cols-2 gap-3 lg:mt-8 lg:grid-cols-4 lg:gap-4">
            {cells.map(({ n, l, icon: Icon }, i) => (
              <div key={l} className={`lift flex flex-col-reverse gap-1 rounded-lg p-4 min-[360px]:p-5 ${GROUNDS[i]}`}>
                <dt className="text-[13px] leading-5 font-semibold text-on-dark/80">{l}</dt>
                {/* the icon sits inside <dd>: a <dl> group may hold only <dt>/<dd> (axe) */}
                {/* break-ui: a 7-digit count fits a 320px half-width card at 20px */}
                <dd className="text-[20px] leading-7 font-extrabold tabular min-[360px]:text-[24px] min-[360px]:leading-8 lg:text-[34px] lg:leading-11">
                  <span className="mb-3 grid size-9 place-items-center rounded-full bg-on-dark/15">
                    <Icon aria-hidden className="size-5" />
                  </span>
                  {n}
                </dd>
              </div>
            ))}
          </dl>
        ) : (
          <p className="mt-6 rounded-lg bg-panel-2 p-5 text-[15px] leading-6 text-on-dark/80">آمار در دسترس نیست.</p>
        )}
      </div>
    </section>
  );
}
