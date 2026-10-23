import Link from "next/link";
import { Banknote, Building2, ChevronRight, Package } from "lucide-react";
import type { CSSProperties } from "react";
import { SiteHeader } from "../../../components/SiteHeader";
import { CARD, JsonLd, ROW_LINK, Section, Thumb } from "../../../components/catalog/parts";
import { FreshBadge } from "../../../components/ui/FreshBadge";
import { api } from "../../../lib/api";
import { faNum, faPrice } from "../../../lib/fa";
import { metaFor, pathOf, SITE_URL } from "../../../lib/seo";
import { or404, param } from "../../../lib/server";

export const revalidate = 3600;
export const fetchCache = "force-cache";
export const generateStaticParams = async () => [];

type Props = { params: Promise<{ slug: string }> };
const load = async ({ params }: Props) => {
  const slug = param((await params).slug);
  return or404(() => api.category(slug));
};

export async function generateMetadata(p: Props) {
  return metaFor("category", await load(p));
}

const minAgo = (iso: string) => Math.max(0, Math.round((Date.now() - Date.parse(iso)) / 60_000));

export default async function CategoryPage(p: Props) {
  const c = await load(p);
  const q = c.priceQuantiles;
  return (
    <>
      <SiteHeader />
      <JsonLd
        data={{
          "@context": "https://schema.org", "@type": "ItemList", name: c.name,
          itemListElement: c.popularProducts.map((x, i) => ({ "@type": "ListItem", position: i + 1, url: new URL(pathOf.product(x.id), SITE_URL).toString() })),
        }}
      />
      <main className="page flex flex-col gap-4 pt-6 pb-12">
        <h1 className="animate-rise text-[28px] leading-10 font-light break-words md:text-[34px] md:leading-12">
          <span className="font-extrabold">{c.name}</span> در بازار مرکز تهران
        </h1>

        <section data-testid="price-range" className={CARD}>
          <h2 className="flex items-center gap-2 text-[17px] font-extrabold leading-7">
            <Banknote aria-hidden className="size-5 text-orange" />
            بازه‌ی قیمت
          </h2>
          {q.p25 != null && q.p75 != null && q.p50 != null ? (
            <>
              <p className="mt-2 text-[15px] leading-7">
                نصف مدل‌ها بین <b className="tabular">{faPrice(q.p25)}</b> تا <b className="tabular">{faPrice(q.p75)}</b>؛ میانه <b className="tabular">{faPrice(q.p50)}</b>.
              </p>
              {q.p10 != null && q.p90 != null && (
                <p className="text-[13px] leading-6 text-ink-muted">ارزان‌ترین ۱۰٪ زیر {faPrice(q.p10)} و گران‌ترین ۱۰٪ بالای {faPrice(q.p90)}.</p>
              )}
              <p className="mt-1 text-[12px] leading-5 text-ink-muted">از کمترین قیمت هر مدلی که دست‌کم دو پیشنهاد دارد؛ قیمت‌های پرت کنار گذاشته شده‌اند.</p>
            </>
          ) : (
            <p className="mt-2 text-[15px] leading-6 text-ink-muted">برای این دسته قیمت کافی ثبت نشده.</p>
          )}
        </section>

        <div className="grid gap-4 md:grid-cols-[minmax(0,1fr)_minmax(0,2fr)] md:items-start">
          <Section title="پاساژهای پرفروشگاه" icon={Building2} testId="top-venues">
            {c.topVenues.length ? (
              <ul className="divide-y divide-line">
                {c.topVenues.map((v, i) => (
                  <li key={v.slug} style={{ "--i": i } as CSSProperties} className="animate-rise stagger">
                    <Link href={pathOf.venue(v.slug)} className={ROW_LINK}>
                      <span className="min-w-0 flex-1 text-[15px] font-bold leading-6 break-words">{faNum(v.name)}</span>
                      <span className="shrink-0 text-[12px] font-semibold text-ink-muted">{faNum(v.count)} فروشگاه</span>
                      <ChevronRight aria-hidden className="nudge size-5 shrink-0 text-ink-muted flip-rtl" />
                    </Link>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-[15px] leading-6 text-ink-muted">هیچ پاساژی برای این دسته ثبت نشده.</p>
            )}
          </Section>

          <Section title="مدل‌های پرطرفدار" icon={Package} testId="products">
            {c.popularProducts.length ? (
              <ul className="grid gap-1 md:grid-cols-2 md:gap-x-4">
                {c.popularProducts.map((x, i) => (
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
            ) : (
              <p className="text-[15px] leading-6 text-ink-muted">مدلی با قیمت ثبت نشده.</p>
            )}
          </Section>
        </div>
      </main>
    </>
  );
}
