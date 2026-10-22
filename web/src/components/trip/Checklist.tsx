"use client";

import Link from "next/link";
import { useRef, useState, type CSSProperties } from "react";
import { CircleCheck, CircleHelp, Copy, CopyCheck, Footprints, MapPin, Navigation, RotateCcw, TriangleAlert } from "lucide-react";
import { faFreshness, faNum, faPriceFull, isStale } from "../../lib/fa";
import { LANDMARKS } from "../../lib/geo";
import { isOpenNow, todayHoursLabel } from "../../lib/hours";
import { toAsciiDigits } from "../../lib/persian";
import type { OfferRow, Trip } from "../../lib/types";
import { resetStorage, useSession } from "../../state/session";
import { DistrictMap } from "../map/DistrictMap";
import { Mascot } from "../Mascot";
import { distanceLabel, placeLine } from "../radar/ShopRow";
import { Btn, btnClass } from "../ui/Btn";
import { EmptyState } from "../ui/EmptyState";
import { FreshBadge } from "../ui/FreshBadge";
import { StockBadge } from "../ui/StockBadge";
import { RecoveryStory } from "./RecoveryStory";
import { floorName } from "./WalkSheet";

type Item = { ok: boolean | null; label: string; detail: string };

const MARK = {
  ok: { Icon: CircleCheck, cls: "bg-verified text-on-dark" },
  warn: { Icon: TriangleAlert, cls: "bg-signal text-on-dark" },
  unknown: { Icon: CircleHelp, cls: "bg-surface-tint text-ink-muted" },
};

export const neshanUrl = (lat: number, lng: number) => `https://neshan.org/maps/@${lat},${lng},18z`;

/** `trip.anchor` is {lat,lng} for a landmark, {} for the phone's own position. */
function anchorName(a: Trip["anchor"]): string | null {
  // ponytail: landmark id not stored; the coordinates are matched back to LANDMARKS.
  return Object.values(LANDMARKS).find((l) => l.lat === a.lat && l.lng === a.lng)?.name ?? null;
}

function Card({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="rounded-lg bg-surface p-5 shadow-card">
      <p className="text-[12px] font-bold text-ink-muted">{title}</p>
      {children}
    </section>
  );
}

export function Checklist({ trip, rows, rowsFailed = false }: { trip: Trip; rows: OfferRow[]; rowsFailed?: boolean }) {
  const { dispatch } = useSession();
  const [copied, setCopied] = useState<"done" | "select" | null>(null);
  const fallback = useRef<HTMLTextAreaElement>(null);
  const { product, shop } = trip;

  if (!shop)
    return (
      <EmptyState
        pose="idle"
        title="هنوز فروشگاه مقصد انتخاب نشده"
        body="از رادار یه فروشگاه انتخاب کن تا چک‌لیست ساخته بشه."
        actions={<Link href={`/radar/${trip.productId}`} className="inline-flex min-h-11 items-center rounded-pill bg-orange px-4 text-[15px] font-bold text-on-orange">رفتن به رادار</Link>}
      />
    );

  const now = new Date();
  const thisRow = rows.find((r) => r.store.id === shop.id);
  const offer = thisRow?.offer;
  const distanceM = thisRow?.store.distanceM ?? null;
  const anchor = anchorName(trip.anchor);
  const a = trip.anchor;
  const mapAnchor = a.lat != null && a.lng != null ? { lat: a.lat, lng: a.lng, label: anchor ?? "نقطه‌ی شروع" } : undefined;
  const open = isOpenNow(shop.weeklyHours, now);
  const hours = todayHoursLabel(shop.weeklyHours, now);
  const maybe = shop.parseConfidence < 0.8 ? "احتمالاً " : "";
  const address = shop.address || null;
  const copyText = `${shop.name} — ${address ?? placeLine(shop)}`;
  const names = Object.fromEntries(rows.map((r) => [r.store.id, r.store.name]));

  const items: Item[] = [
    open === null
      ? { ok: null, label: "ساعت کاری", detail: `${hours} — قبل از رفتن زنگ بزن` }
      : open
        ? { ok: true, label: "ساعت کاری", detail: `الان باز است · ${hours}` }
        : { ok: false, label: "ساعت کاری", detail: `الان بسته است · ${hours}` },
    !offer
      ? { ok: null, label: "تازگی قیمت", detail: rowsFailed ? "قیمت الان در دسترس نیست" : "قیمتی از این فروشگاه برای این مدل پیدا نشد" }
      : isStale(offer.updatedMinAgo)
        ? { ok: false, label: "تازگی قیمت", detail: `آخرین ثبت ${faFreshness(offer.updatedMinAgo)} — ممکن است تغییر کرده باشد` }
        : { ok: true, label: "تازگی قیمت", detail: `به‌روزرسانی ${faFreshness(offer.updatedMinAgo)}` },
    offer?.stock === "confirmed"
      ? { ok: true, label: "موجودی", detail: "یه خریدار تو ۴۸ ساعت گذشته تأیید کرده که داشت — باز هم قطعی نیست" }
      : { ok: null, label: "موجودی", detail: "نامشخص — قبل از رفتن زنگ بزن" },
    shop.unit != null
      ? { ok: true, label: "واحد", detail: `${maybe}واحد ${faNum(shop.unit)}${shop.floor != null ? ` · طبقه ${Number.isInteger(Number(shop.floor)) ? floorName(Number(shop.floor)) : faNum(shop.floor)}` : ""}` }
      : { ok: false, label: "واحد", detail: "شماره‌ی واحد ثبت نشده — از اطلاعات پاساژ بپرس" },
    shop.installment === true
      ? { ok: true, label: "اقساط", detail: "فروش اقساطی دارد" }
      : shop.installment === false
        ? { ok: false, label: "اقساط", detail: "فروش اقساطی ندارد" }
        : { ok: null, label: "اقساط", detail: "اطلاعات اقساط ثبت نشده" },
  ];

  const copy = () => {
    const done = () => {
      setCopied("done");
      setTimeout(() => setCopied(null), 1800);
    };
    // ponytail: webviews without the Clipboard API get the text selected for a long-press copy.
    const select = () => {
      setCopied("select");
      setTimeout(() => fallback.current?.select());
    };
    if (navigator.clipboard) navigator.clipboard.writeText(copyText).then(done, select);
    else select();
  };

  return (
    <div className="lg:grid lg:grid-cols-[minmax(0,1fr)_400px] lg:items-start lg:gap-8">
      <div className="min-w-0">
        <div data-page-head className="mt-4 flex animate-rise items-start gap-3">
          <Mascot pose="point" react="hop" className="size-24" alt="ترب‌گرد مسیر را نشان می‌دهد" />
          <div className="min-w-0 pt-2">
            <span className="rounded-pill bg-panel px-3 py-1 text-[12px] font-bold text-on-dark">آماده‌ی رفتن</span>
            <h1 className="mt-2 text-[22px] leading-8">
              <span className="font-light">چک‌لیست </span>
              <span className="font-extrabold">قبل از حرکت</span>
            </h1>
            <p className="mt-1 text-[13px] leading-5 text-ink-muted">هنوز چیزی قطعی نیست؛ این برنامه‌ی رفتن توست، با ابهام‌هایش.</p>
          </div>
        </div>

        <div className="mt-4 grid gap-3 md:grid-cols-2">
          <Card title="مدل انتخابی">
            <div className="mt-2 flex items-start gap-3">
              {product.imageUrl ? (
                // eslint-disable-next-line @next/next/no-img-element -- Torob CDN image, no optimizer
                <img src={product.imageUrl} alt="" className="h-16 w-16 shrink-0 rounded-sm bg-surface-tint object-contain" />
              ) : (
                <span aria-hidden className="h-16 w-16 shrink-0 rounded-sm bg-surface-tint" />
              )}
              <p data-testid="product-title" className="line-clamp-3 min-w-0 break-words text-[15px] font-bold leading-6">{product.title}</p>
            </div>
            {offer ? (
              <>
                <p className="tabular mt-3 text-[22px] font-bold leading-8">{faPriceFull(offer.priceToman)}</p>
                <div className="mt-1 flex flex-wrap items-center gap-2">
                  <FreshBadge updatedMinAgo={offer.updatedMinAgo} />
                  <StockBadge stock={offer.stock} />
                </div>
              </>
            ) : (
              <p className="mt-3 text-[13px] text-ink-muted">{rowsFailed ? "قیمت الان در دسترس نیست." : "قیمتی از این فروشگاه برای این مدل پیدا نشد."}</p>
            )}
          </Card>

          <Card title="فروشگاه مقصد">
            <p data-testid="shop-name" className="mt-1 break-words text-[17px] font-extrabold leading-7">{shop.name}</p>
            <p className="mt-0.5 break-words text-[13px] leading-5 text-ink-muted">{placeLine(shop)}</p>
            <p className="text-[13px] leading-5 text-ink-muted">{distanceLabel(distanceM)} {anchor ? `از ${anchor}` : "از موقعیت تو"}</p>
            <p className="mt-2 text-[13px] leading-5">{hours}</p>
            <p className="text-[13px] leading-5">
              {shop.contact ? (
                <a href={`tel:${toAsciiDigits(shop.contact)}`} className="tabular inline-flex min-h-11 items-center font-bold underline underline-offset-4">
                  {shop.contact}
                </a>
              ) : (
                <span className="text-ink-muted">شماره ثبت نشده</span>
              )}
            </p>
          </Card>
        </div>

        <section className="mt-3 rounded-lg bg-surface p-5 shadow-card">
          <p className="flex items-center gap-1 text-[12px] font-bold text-ink-muted">
            <MapPin aria-hidden className="size-4 text-orange" />
            آدرس
          </p>
          <p className={`mt-1 break-words text-[15px] leading-6 ${address ? "" : "text-ink-muted"}`}>{address ?? "آدرس ثبت نشده"}</p>
          <div className="mt-3 flex flex-wrap gap-2">
            {shop.lat != null && shop.lng != null ? (
              <a
                href={neshanUrl(shop.lat, shop.lng)}
                target="_blank"
                rel="noopener"
                className={btnClass()}
              >
                <Navigation aria-hidden className="size-5" />
                باز کردن مسیر در نقشه
              </a>
            ) : (
              <p className="self-center text-[13px] text-ink-muted">مختصات فروشگاه ثبت نشده</p>
            )}
            <Btn variant="ghost" icon={copied === "done" ? CopyCheck : Copy} onClick={copy}>
              {copied === "done" ? "کپی شد" : "کپی آدرس"}
            </Btn>
          </div>
          {copied === "select" && (
            <>
              <textarea ref={fallback} readOnly value={copyText} rows={2} aria-label="متن آدرس" className="mt-3 w-full rounded-sm bg-surface-tint p-3 text-[16px]" />
              <p className="text-[12px] text-ink-muted">متن انتخاب شد؛ نگه دار و کپی کن.</p>
            </>
          )}
        </section>

        <section className="mt-3 rounded-lg bg-surface p-5 shadow-card">
          <h2 className="text-[15px] font-extrabold">چک‌لیست واقع‌بینانه</h2>
          <ul aria-label="چک‌لیست" className="mt-2 divide-y divide-line">
            {items.map((c, i) => {
              const m = MARK[c.ok === true ? "ok" : c.ok === false ? "warn" : "unknown"];
              return (
                <li key={c.label} style={{ "--i": i } as CSSProperties} className="stagger flex animate-rise items-start gap-3 py-3">
                  {/* the status icon pops with its row (motion table: scale 0.8→1 + opacity 180 ms; reduced motion: opacity) */}
                  <span
                    aria-hidden
                    className={`pop-in grid h-7 w-7 shrink-0 place-items-center rounded-full [transition-delay:calc(min(var(--i),7)*var(--stagger))] motion-safe:[--pop:0.8] ${m.cls}`}
                  >
                    <m.Icon className="size-4.5" />
                  </span>
                  <div className="min-w-0">
                    <p className="text-[15px] font-bold leading-6">{c.label}</p>
                    <p className="break-words text-[13px] leading-5 text-ink-muted">{c.detail}</p>
                  </div>
                </li>
              );
            })}
          </ul>
        </section>

        <RecoveryStory failures={trip.failures} names={names} finalName={shop.name} />
      </div>

      {/* Desktop: the shop on the district map beside the checklist. Phone: no map (walk mode and Neshan are one tap away). */}
      <aside aria-label="مسیر روی نقشه" className="lg:sticky lg:top-20">
        {thisRow && (
          <div className="hidden lg:mt-4 lg:block">
            {/* no legend: the shop card already says «از مترو سعدی»; saying it twice reads as two facts */}
            <DistrictMap rows={[thisRow]} anchor={mapAnchor} selectedId={shop.id} legend={false} />
          </div>
        )}
        <Link href={`/trip/${trip.id}/walk`} className={`${btnClass()} mt-5 w-full lg:mt-4`}>
          <Footprints aria-hidden className="size-5" />
          شروع مسیر
        </Link>
        <Btn
          variant="ghost"
          icon={RotateCcw}
          className="mt-3 w-full"
          onClick={() => {
            resetStorage();
            dispatch({ type: "RESET" }); // the provider routes the consult stage to /start
          }}
        >
          شروع دوباره
        </Btn>
      </aside>
    </div>
  );
}
