import Link from "next/link";
import { ChevronRight, MapPin } from "lucide-react";
import { SiteHeader } from "../../../components/SiteHeader";
import { ReportButtons } from "../../../components/catalog/ReportButtons";
import { Crumbs, JsonLd, ROW_LINK, Section, Thumb } from "../../../components/catalog/parts";
import { placeLine } from "../../../components/radar/ShopRow";
import { FreshBadge } from "../../../components/ui/FreshBadge";
import { api } from "../../../lib/api";
import { faGroup, faNum } from "../../../lib/fa";
import { weekHours } from "../../../lib/hours";
import { toAsciiDigits } from "../../../lib/persian";
import { jsonLdShop, metaFor, pathOf } from "../../../lib/seo";
import { or404, param } from "../../../lib/server";

export const revalidate = 3600;
export const fetchCache = "force-cache";
export const generateStaticParams = async () => [];

type Props = { params: Promise<{ id: string }> };
const load = async ({ params }: Props) => {
  const id = param((await params).id);
  return or404(() => api.shop(id));
};

export async function generateMetadata(p: Props) {
  return metaFor("shop", await load(p));
}

const minAgo = (iso: string) => Math.max(0, Math.round((Date.now() - Date.parse(iso)) / 60_000));

export default async function ShopPage(p: Props) {
  const s = await load(p);
  const installment = s.installment === true ? "اقساط دارد" : s.installment === false ? "اقساط ندارد" : "اطلاعات اقساط ثبت نشده";
  return (
    <>
      <SiteHeader />
      <JsonLd data={jsonLdShop(s)} />
      <main className="page flex flex-col gap-4 pt-4 pb-12">
        <header className="animate-rise">
          {s.mall && s.venueSlug && <Crumbs items={[{ href: pathOf.venue(s.venueSlug), label: faNum(s.mall) }]} />}
          <h1 className="text-[28px] leading-10 font-extrabold break-words">{s.name}</h1>
          <p className="mt-1 flex gap-1 text-[15px] leading-6 text-ink-muted">
            <MapPin aria-hidden className="mt-1 size-4 shrink-0" />
            <span className="min-w-0 break-words">{placeLine(s)}</span>
          </p>
        </header>

        <div className="grid gap-4 md:grid-cols-2 md:items-start">
          <div className="flex flex-col gap-4">
            <Section title="اطلاعات فروشگاه">
              <dl className="grid gap-3 text-[15px] leading-6">
                <div>
                  <dt className="text-[12px] font-semibold text-ink-muted">آدرس</dt>
                  <dd className="break-words">{s.address || "آدرس ثبت نشده"}</dd>
                </div>
                <div>
                  <dt className="text-[12px] font-semibold text-ink-muted">تماس</dt>
                  <dd>
                    {s.contact ? (
                      <a href={`tel:${toAsciiDigits(s.contact)}`} className="tabular inline-flex min-h-11 items-center font-bold underline underline-offset-4">{s.contact}</a>
                    ) : "شماره ثبت نشده"}
                  </dd>
                </div>
                <div>
                  <dt className="text-[12px] font-semibold text-ink-muted">اقساط</dt>
                  <dd>{installment}</dd>
                </div>
                <div>
                  <dt className="text-[12px] font-semibold text-ink-muted">ساعت کاری (اعلام‌شده در ترب)</dt>
                  <dd>
                    <ul className="mt-1 grid gap-0.5 text-[13px]">
                      {weekHours(s.weeklyHours).map((d) => (
                        <li key={d.day} className="flex justify-between gap-3">
                          <span>{d.day}</span>
                          <span className={`tabular ${d.hours === "ثبت نشده" ? "text-ink-muted" : ""}`}>{d.hours}</span>
                        </li>
                      ))}
                    </ul>
                  </dd>
                </div>
              </dl>
            </Section>
            <ReportButtons shopId={s.id} />
          </div>

          <Section title={`قیمت‌های ثبت‌شده (${faNum(s.offerCount)} پیشنهاد)`}>
            {s.offers.length ? (
              <ul className="divide-y divide-line">
                {s.offers.map((o) => (
                  <li key={o.productId}>
                    <Link href={pathOf.product(o.productId)} className={ROW_LINK}>
                      <Thumb src={o.imageUrl} className="size-12" />
                      <span className="min-w-0 flex-1">
                        <span className="line-clamp-2 text-[13px] font-bold leading-5 break-words">{o.title}</span>
                        <span className="tabular block text-[15px] font-extrabold leading-6">{faGroup(o.price)} تومان</span>
                        <FreshBadge updatedMinAgo={minAgo(o.lastPriceChangedAt)} />
                      </span>
                      <ChevronRight aria-hidden className="size-5 shrink-0 text-ink-muted flip-rtl" />
                    </Link>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-[15px] leading-6 text-ink-muted">قیمتی از این فروشگاه ثبت نشده.</p>
            )}
            <p className="mt-3 text-[12px] leading-5 text-ink-muted">موجودی از روی این قیمت‌ها معلوم نیست؛ قبل از رفتن زنگ بزن.</p>
          </Section>
        </div>
      </main>
    </>
  );
}
