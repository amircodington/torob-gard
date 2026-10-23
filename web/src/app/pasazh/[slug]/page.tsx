import Link from "next/link";
import { ChevronRight, MapPin, ShieldCheck } from "lucide-react";
import type { CSSProperties } from "react";
import { SiteHeader } from "../../../components/SiteHeader";
import { CARD, JsonLd, ROW_LINK, Section } from "../../../components/catalog/parts";
import { DistrictMap } from "../../../components/map/DistrictMap";
import { floorUnit } from "../../../components/radar/ShopRow";
import { api } from "../../../lib/api";
import { faNum } from "../../../lib/fa";
import { jsonLdVenue, metaFor, pathOf } from "../../../lib/seo";
import { or404, param } from "../../../lib/server";

// ISR 1 h (api.ts fetches no-store for the journey; force-cache lets this route cache).
export const revalidate = 3600;
export const fetchCache = "force-cache";
export const generateStaticParams = async () => [];

type Props = { params: Promise<{ slug: string }> };
const load = async ({ params }: Props) => {
  const slug = param((await params).slug);
  return or404(() => api.venue(slug));
};

export async function generateMetadata(p: Props) {
  return metaFor("venue", await load(p));
}

const DATE = new Intl.DateTimeFormat("fa-IR", { dateStyle: "long", timeZone: "Asia/Tehran" });

export default async function PasazhPage(p: Props) {
  const v = await load(p);
  const shops = v.floors.reduce((n, f) => n + f.shops.length, 0);
  return (
    <>
      <SiteHeader />
      <JsonLd data={jsonLdVenue(v)} />
      <main className="page flex flex-col gap-4 pt-6 pb-12">
        <header className="animate-rise">
          <h1 className="text-[28px] leading-10 font-light md:text-[34px] md:leading-12">
            مغازه‌های <span className="font-extrabold break-words">{faNum(v.name)}</span>
          </h1>
          <p className="mt-1 flex gap-1 text-[15px] leading-6 text-ink-muted">
            <MapPin aria-hidden className="mt-1 size-4 shrink-0" />
            <span className="min-w-0 break-words">{v.address || "آدرس دقیق ثبت نشده"} · {faNum(shops)} فروشگاه</span>
          </p>
          <p className="mt-1 flex items-center gap-1 text-[12px] font-semibold text-ink-muted">
            <ShieldCheck aria-hidden className="size-3.5 shrink-0" />
            {v.verifiedAt ? `اطلاعات پاساژ تأییدشده در ${DATE.format(new Date(v.verifiedAt))}` : "اطلاعات پاساژ هنوز حضوری تأیید نشده؛ طبقه‌ها از آدرس فروشگاه‌ها خوانده شده."}
          </p>
        </header>

        <div className="grid gap-4 md:grid-cols-[minmax(0,1fr)_minmax(0,1fr)] md:items-start">
          {v.lat != null && v.lng != null && (
            <div className="md:sticky md:top-20 md:order-last">
              <DistrictMap rows={[]} anchor={{ lat: v.lat, lng: v.lng, label: faNum(v.name) }} legend={false} />
            </div>
          )}
          <div className="flex flex-col gap-4">
            {v.topCategories.length > 0 && (
              <Section title="دسته‌های پرفروش این پاساژ">
                <ul className="flex flex-wrap gap-2">
                  {v.topCategories.map((c) => (
                    <li key={c.slug}>
                      <Link href={pathOf.category(c.slug)} className="inline-flex min-h-11 max-w-full items-center gap-1.5 rounded-pill bg-surface-tint px-4 text-[13px] font-bold [overflow-wrap:anywhere] focus-visible:outline-2 focus-visible:outline-focus active:scale-[0.97] transition-transform duration-(--duration-press)">
                        {c.name}
                        <span className="font-semibold text-ink-muted">{faNum(c.count)} مدل</span>
                      </Link>
                    </li>
                  ))}
                </ul>
              </Section>
            )}

            {v.floors.map((f, i) => (
              <section key={f.floor ?? "none"} data-testid="floor" style={{ "--i": i } as CSSProperties} className={`${CARD} animate-rise stagger`}>
                <div className="flex items-baseline justify-between gap-2">
                  <h2 className="text-[17px] font-extrabold leading-7">{f.label}</h2>
                  <span className="text-[12px] font-semibold text-ink-muted">{faNum(f.shops.length)} فروشگاه</span>
                </div>
                <ul className="mt-1 divide-y divide-line">
                  {f.shops.map((s) => (
                    <li key={s.id}>
                      <Link href={pathOf.shop(s.id)} className={ROW_LINK}>
                        <span className="min-w-0 flex-1">
                          <span className="block text-[15px] font-bold leading-6 break-words">{s.name}</span>
                          <span className="block text-[12px] leading-5 text-ink-muted">
                            {/* a guessed parse may sit under the wrong heading, so its row restates the floor, hedged */}
                            {s.parseConfidence < 0.8 ? floorUnit(s) : s.unit ? `واحد ${faNum(s.unit)}` : "شماره‌ی واحد ثبت نشده"}
                          </span>
                        </span>
                        <ChevronRight aria-hidden className="size-5 shrink-0 text-ink-muted flip-rtl" />
                      </Link>
                    </li>
                  ))}
                </ul>
              </section>
            ))}
          </div>
        </div>
      </main>
    </>
  );
}
