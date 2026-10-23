import type { CSSProperties } from "react";
import Link from "next/link";
import { Headphones, Laptop, Smartphone } from "lucide-react";
import { faNum } from "../../lib/fa";
import { pathOf } from "../../lib/seo";
import type { Venue } from "../../lib/types";

const CATEGORIES = [
  { l: "موبایل", icon: Smartphone },
  { l: "لپ‌تاپ", icon: Laptop },
  { l: "لوازم جانبی", icon: Headphones },
];

export function PasazhStrip({ venues }: { venues: Venue[] }) {
  const max = Math.max(1, ...venues.map((v) => v.shopCount));
  return (
    <section className="grid gap-10 lg:grid-cols-[2fr_1fr] lg:gap-6">
      <div>
        <h2 className="text-[22px] leading-8 font-light">
          پاساژهای <span className="font-extrabold">پرفروشگاه</span>
        </h2>
        {venues.length ? (
          // Brand data shape: rounded bars with a dot tip; the first (most shops) is orange.
          <ul data-testid="pasazh-strip" className="mt-4 flex flex-col gap-4 md:gap-3 rounded-lg bg-surface p-5 shadow-card">
            {venues.map((v, i) => (
              // Phone: name and count on a line, the bar under them (break-ui: a middle column left it ~20px at 320).
              <li key={v.slug} className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-x-3 gap-y-1.5 md:grid-cols-[minmax(0,12rem)_minmax(0,1fr)_auto]">
                <Link href={pathOf.venue(v.slug)} className="text-[13px] leading-5 font-bold [overflow-wrap:anywhere] underline-offset-4 hover:underline focus-visible:outline-2 focus-visible:outline-focus md:text-[15px] md:leading-6">{faNum(v.name)}</Link>
                <span aria-hidden className="col-span-2 row-start-2 pe-1.5 md:col-span-1 md:row-start-auto">
                  {/* origin-right = inline-start under dir="rtl" */}
                  <span
                    data-bar
                    style={{ width: `${Math.max(4, (v.shopCount / max) * 100)}%`, "--i": i } as CSSProperties}
                    className={`relative block h-2 origin-right animate-grow stagger rounded-pill ${i === 0 ? "bg-orange" : "bg-orange-tint"}`}
                  >
                    <span className="absolute -end-1.5 top-1/2 size-3 -translate-y-1/2 rounded-full bg-surface ring-2 ring-orange" />
                  </span>
                </span>
                <span className="text-[13px] leading-5 text-ink-muted tabular md:col-start-3">
                  <span className="font-bold text-ink">{faNum(v.shopCount)}</span> فروشگاه
                </span>
              </li>
            ))}
          </ul>
        ) : (
          <p className="mt-4 text-[15px] leading-6 text-ink-muted">فهرست پاساژها در دسترس نیست.</p>
        )}
      </div>

      <div>
        <h2 className="text-[22px] leading-8 font-light">
          دنبال <span className="font-extrabold">چی</span> هستی؟
        </h2>
        <ul className="mt-4 grid grid-cols-3 gap-2 lg:grid-cols-1 lg:gap-3">
          {CATEGORIES.map(({ l, icon: Icon }) => (
            <li key={l}>
              <Link
                href="/start"
                className="flex min-h-20 flex-col items-center justify-center gap-2 rounded-lg bg-surface px-2 text-center text-[15px] font-bold shadow-card transition-transform duration-(--duration-press) ease-out focus-visible:outline-2 focus-visible:outline-focus active:scale-[0.97] lg:min-h-16 lg:flex-row lg:justify-start lg:gap-3 lg:px-5"
              >
                <Icon aria-hidden className="size-6 text-ink-muted" />
                {l}
              </Link>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
