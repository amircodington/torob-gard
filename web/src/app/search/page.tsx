import Link from "next/link";
import type { Metadata } from "next";
import { ChevronRight, Search } from "lucide-react";
import type { CSSProperties } from "react";
import { SiteHeader } from "../../components/SiteHeader";
import { ROW_LINK, Section, Thumb } from "../../components/catalog/parts";
import { btnClass } from "../../components/ui/Btn";
import { EmptyState } from "../../components/ui/EmptyState";
import { FreshBadge } from "../../components/ui/FreshBadge";
import { api } from "../../lib/api";
import { faNum, faPrice } from "../../lib/fa";
import { pathOf } from "../../lib/seo";
import { param } from "../../lib/server";

// Result pages are endless URL space and thin content: keep them out of the index.
export const metadata: Metadata = { title: "جستجو", robots: { index: false, follow: true } };

type Props = { searchParams: Promise<{ q?: string | string[] }> };
const minAgo = (iso: string) => Math.max(0, Math.round((Date.now() - Date.parse(iso)) / 60_000));

export default async function SearchPage({ searchParams }: Props) {
  const raw = (await searchParams).q;
  const q = param(Array.isArray(raw) ? raw[0] : (raw ?? "")).trim().slice(0, 100);
  process.env.API_URL ??= "http://localhost:8000"; // ponytail: as in lib/server.ts; set API_URL in prod.
  const hits = q ? await api.search(q) : null;
  const empty = hits && !hits.products.length && !hits.shops.length;
  return (
    <>
      <SiteHeader />
      <main className="page flex flex-col gap-4 pt-6 pb-12">
        <h1 className="animate-rise text-[28px] leading-10 font-extrabold md:text-[34px] md:leading-12">جستجو</h1>
        <form action="/search" role="search" className="flex items-center gap-2">
          <input
            name="q" defaultValue={q} type="search" enterKeyHint="search" aria-label="نام مدل یا مغازه" placeholder="مثلاً آیفون ۱۳ یا علاءالدین"
            className="min-h-11 min-w-0 flex-1 rounded-pill bg-surface px-4 text-[16px] text-ink shadow-card outline-none focus-visible:outline-2 focus-visible:outline-focus"
          />
          <button type="submit" className={btnClass()}>
            <Search aria-hidden className="size-5 shrink-0" />
            بگرد
          </button>
        </form>

        {!q && <p className="text-[15px] leading-6 text-ink-muted">اسم مدل، برند یا مغازه رو بنویس؛ با فارسی یا انگلیسی، با ۱۳ یا ۱۳.</p>}
        {empty && (
          <EmptyState
            pose="stuck" title={`چیزی برای «${q}» پیدا نشد`}
            body="تو داده‌ی ما نیست یا جور دیگه‌ای نوشته شده. اسم کوتاه‌تر یا فقط برند رو امتحان کن."
            actions={<Link href="/start" className={btnClass("ghost")}>از نیازت شروع کن</Link>}
          />
        )}

        {hits && !!hits.products.length && (
          <Section title="مدل‌ها" testId="search-products">
            <ul className="grid gap-1 md:grid-cols-2 md:gap-x-4">
              {hits.products.map((x, i) => (
                <li key={x.id} style={{ "--i": i } as CSSProperties} className="animate-rise stagger">
                  <Link href={pathOf.product(x.id)} className={ROW_LINK}>
                    <Thumb src={x.imageUrl} className="size-14" />
                    <span className="min-w-0 flex-1">
                      <span className="line-clamp-2 text-[13px] font-bold leading-5 break-words">{x.title}</span>
                      <span className="tabular block text-[15px] font-extrabold leading-6">از {faPrice(x.minPrice)}</span>
                      <span className="block text-[12px] text-ink-muted">{faNum(x.offerCount)} پیشنهاد</span>
                      {x.priceAt ? <FreshBadge updatedMinAgo={minAgo(x.priceAt)} prefix="کمترین قیمت: " /> : <span className="text-[12px] font-semibold text-ink-muted">زمان قیمت ثبت نشده</span>}
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          </Section>
        )}

        {hits && !!hits.shops.length && (
          <Section title="مغازه‌ها" testId="search-shops">
            <ul className="divide-y divide-line">
              {hits.shops.map((s) => (
                <li key={s.id}>
                  <Link href={pathOf.shop(s.id)} className={ROW_LINK}>
                    <span className="min-w-0 flex-1">
                      <span className="block text-[15px] font-bold leading-6 break-words">{s.name}</span>
                      <span className="block text-[12px] text-ink-muted">
                        {s.venueName ? faNum(s.venueName) : "پاساژ ثبت نشده"} · {s.floor != null ? `طبقه ${faNum(s.floor)}` : "طبقه نامشخص"}
                      </span>
                    </span>
                    <ChevronRight aria-hidden className="size-5 shrink-0 text-ink-muted flip-rtl" />
                  </Link>
                </li>
              ))}
            </ul>
          </Section>
        )}
      </main>
    </>
  );
}
