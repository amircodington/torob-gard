import Link from "next/link";
import { faNum } from "../../lib/fa";
import type { Venue } from "../../lib/types";

const CATEGORIES = ["موبایل", "لپ‌تاپ", "لوازم جانبی"];

export function PasazhStrip({ venues }: { venues: Venue[] }) {
  return (
    <section>
      <h2 className="text-[22px] leading-8 font-light">
        پاساژهای <span className="font-extrabold">پرفروشگاه</span>
      </h2>
      {venues.length ? (
        // ponytail: plain cards, not links; pasazh pages are P3.
        <ul data-testid="pasazh-strip" className="mt-4 flex flex-wrap gap-2">
          {venues.map((v) => (
            <li key={v.slug} className="rounded-pill bg-surface px-4 py-2 shadow-card">
              <span className="text-[15px] leading-6 font-bold">{faNum(v.name)}</span>
              <span className="text-[13px] leading-6 text-ink-muted"> · {faNum(v.shopCount)} فروشگاه</span>
            </li>
          ))}
        </ul>
      ) : (
        <p className="mt-4 text-[15px] leading-6 text-ink-muted">فهرست پاساژها در دسترس نیست.</p>
      )}

      <h2 className="mt-10 text-[22px] leading-8 font-light">
        دنبال <span className="font-extrabold">چی</span> هستی؟
      </h2>
      <ul className="mt-4 grid grid-cols-3 gap-2">
        {CATEGORIES.map((c) => (
          <li key={c}>
            <Link href="/start" className="grid min-h-14 place-items-center rounded-lg bg-surface px-2 text-center text-[15px] font-bold shadow-card active:scale-[0.97] transition-transform">
              {c}
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}
