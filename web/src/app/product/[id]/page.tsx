import Link from "next/link";
import type { CSSProperties } from "react";
import { Banknote, ChevronRight, ListChecks, Radar, Store } from "lucide-react";
import { SiteHeader } from "../../../components/SiteHeader";
import { ProductChat } from "../../../components/chat/ProductChat";
import { SellerNotes } from "../../../components/catalog/SellerNotes";
import { Crumbs, JsonLd, ROW_LINK, Section, Thumb } from "../../../components/catalog/parts";
import { placeLine } from "../../../components/radar/ShopRow";
import { btnClass } from "../../../components/ui/Btn";
import { FreshBadge } from "../../../components/ui/FreshBadge";
import { StockBadge } from "../../../components/ui/StockBadge";
import { api } from "../../../lib/api";
import { faNum, faPriceFull } from "../../../lib/fa";
import { jsonLdProduct, metaFor, pathOf } from "../../../lib/seo";
import { or404, param } from "../../../lib/server";

// Rendered per request: ISR here (revalidate + fetchCache "force-cache") deadlocks Next 16.4's fetch-cache
// lock on a first visit and the page never answers. The API answers in ~10 ms.
export const dynamic = "force-dynamic";

type Props = { params: Promise<{ id: string }> };
const load = async ({ params }: Props) => {
  const id = param((await params).id);
  return or404(() => api.product(id));
};

export async function generateMetadata(p: Props) {
  return metaFor("product", await load(p));
}

const SHOWN = 10;

export default async function ProductPage(p: Props) {
  const product = await load(p);
  // Rows come cheapest first; stock and «احتمالاً» floors as on the radar. A failed fetch still shows the range.
  const rows = await api.offerRows(product.id).catch(() => null);
  const range = [
    { l: "کمترین", v: product.minPrice },
    { l: "میانه", v: product.medianPrice },
    { l: "بیشترین", v: product.maxPrice },
  ];
  const specs = product.specs.filter((s) => s.key && s.value != null).slice(0, 12);
  return (
    <>
      <SiteHeader />
      <JsonLd data={jsonLdProduct(product, rows ?? [])} />
      <main className="page flex flex-col gap-4 pt-4 pb-12">
        <header className="animate-rise">
          <Crumbs items={[{ href: pathOf.category(product.categorySlug), label: product.categoryName }]} />
          <div className="mt-1 flex items-start gap-4">
            <Thumb src={product.imageUrls[0] ?? null} className="size-24 md:size-32" />
            <div className="min-w-0 flex-1">
              <h1 className="text-[22px] leading-8 font-extrabold break-words md:text-[28px] md:leading-10">{product.title}</h1>
              {product.brand && <p className="text-[15px] leading-6 text-ink-muted">{product.brand}</p>}
            </div>
          </div>
        </header>

        <section data-testid="price-range" className="rounded-lg bg-surface p-5 shadow-card">
          <h2 className="flex items-center gap-2 text-[17px] font-extrabold leading-7">
            <Banknote aria-hidden className="size-5 text-orange" />
            قیمت در بازار مرکز تهران
          </h2>
          <dl className="mt-3 grid grid-cols-3 gap-2 text-center">
            {range.map((r) => (
              <div key={r.l} className="rounded-md bg-surface-tint px-1 py-3">
                <dt className="text-[12px] font-semibold text-ink-muted">{r.l}</dt>
                <dd className="tabular mt-1 text-[13px] font-extrabold leading-5 md:text-[15px]">{r.v != null ? faPriceFull(r.v) : "ثبت نشده"}</dd>
              </div>
            ))}
          </dl>
          <p className="mt-3">
            {rows?.[0] ? <FreshBadge updatedMinAgo={rows[0].offer.updatedMinAgo} prefix="کمترین قیمت: " /> : <span className="text-[12px] font-semibold text-ink-muted">زمان قیمت‌ها ثبت نشده</span>}
          </p>
          <p className="mt-1 text-[12px] leading-5 text-ink-muted">از {faNum(product.offerCount)} پیشنهاد؛ قیمت‌های پرت کنار گذاشته شده‌اند.</p>
          <div className="mt-4 flex flex-col gap-2 md:flex-row">
            <Link href={`/radar/${encodeURIComponent(product.id)}`} className={`${btnClass()} w-full md:w-auto`}>
              <Radar aria-hidden className="hover-spin size-5 shrink-0" />
              پیدا کردن فروشگاه
            </Link>
            <ProductChat productId={product.id} title={product.title} />
          </div>
        </section>

        <div className="grid gap-4 md:grid-cols-2 md:items-start">
          <Section title="فروشگاه‌ها" icon={Store}>
            {rows == null ? (
              <p className="text-[15px] leading-6 text-ink-muted">فهرست فروشگاه‌ها الان باز نشد.</p>
            ) : rows.length === 0 ? (
              <p className="text-[15px] leading-6 text-ink-muted">برای این مدل فروشگاهی ثبت نشده.</p>
            ) : (
              <ul className="divide-y divide-line">
                {rows.slice(0, SHOWN).map((r, i) => (
                  <li key={r.offer.offerId} style={{ "--i": i } as CSSProperties} className="animate-rise stagger">
                    <Link href={pathOf.shop(r.store.id)} className={ROW_LINK}>
                      <span className="min-w-0 flex-1">
                        <span className="block text-[15px] font-bold leading-6 break-words">{r.store.name}</span>
                        <span className="block text-[12px] leading-5 text-ink-muted break-words">{placeLine(r.store)}</span>
                        <span className="tabular block text-[15px] font-extrabold leading-6">{faPriceFull(r.offer.priceToman)}</span>
                        <span className="flex flex-wrap items-center gap-2">
                          <FreshBadge updatedMinAgo={r.offer.updatedMinAgo} />
                          <StockBadge stock={r.offer.stock} />
                        </span>
                      </span>
                      <ChevronRight aria-hidden className="nudge size-5 shrink-0 text-ink-muted flip-rtl" />
                    </Link>
                  </li>
                ))}
              </ul>
            )}
            {rows && rows.length > SHOWN && (
              <p className="mt-2 text-[13px] leading-5 text-ink-muted">و {faNum(rows.length - SHOWN)} فروشگاه دیگر در رادار.</p>
            )}
          </Section>

          {/* one seller's note is that seller's ad, not a summary (agent seller_notes MIN_NOTES) */}
          {product.sellerNotes >= 2 && <SellerNotes productId={product.id} count={product.sellerNotes} />}

          {specs.length > 0 && (
            <Section title="مشخصات" icon={ListChecks}>
              <dl className="divide-y divide-line text-[13px] leading-5">
                {specs.map((s, i) => (
                  <div key={i} className="flex justify-between gap-3 py-2">
                    <dt className="text-ink-muted">{String(s.key)}</dt>
                    <dd className="min-w-0 text-end font-semibold break-words">{String(s.value)}</dd>
                  </div>
                ))}
              </dl>
            </Section>
          )}
        </div>
      </main>
    </>
  );
}
