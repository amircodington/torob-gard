import { faGroup, faNum } from "../../lib/fa";
import type { Stats } from "../../lib/types";

// ponytail: plain stat cards; four unrelated counts don't make a bar chart.
export function LiveNumbers({ stats, priceDaysAgo }: { stats: Stats | null; priceDaysAgo: number | null }) {
  const cells = stats && [
    { n: faGroup(stats.shops), l: "فروشگاه" },
    { n: faGroup(stats.venues), l: "پاساژ" },
    { n: faGroup(stats.offers), l: "قیمت ثبت‌شده" },
    { n: priceDaysAgo === null ? "—" : `${faNum(priceDaysAgo)} روز پیش`, l: priceDaysAgo === null ? "تاریخ قیمت ثبت نشده" : "آخرین قیمت" },
  ];
  return (
    <section data-testid="live-numbers">
      <h2 className="text-[22px] leading-8 font-light">
        بازار <span className="font-extrabold">به عدد</span>
      </h2>
      {cells ? (
        <dl className="mt-4 grid grid-cols-2 gap-3">
          {cells.map((c) => (
            <div key={c.l} className="flex flex-col-reverse rounded-lg bg-surface p-5 shadow-card">
              <dt className="text-[13px] leading-5 font-semibold text-ink-muted">{c.l}</dt>
              <dd className="text-[22px] leading-8 font-bold tabular">{c.n}</dd>
            </div>
          ))}
        </dl>
      ) : (
        <p className="mt-4 rounded-lg bg-surface p-5 text-[15px] leading-6 text-ink-muted shadow-card">آمار در دسترس نیست.</p>
      )}
    </section>
  );
}
