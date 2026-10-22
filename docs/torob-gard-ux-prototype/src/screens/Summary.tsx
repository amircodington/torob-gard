import {
  Banknote,
  CircleCheck,
  CircleDashed,
  Clock3,
  Copy,
  Footprints,
  ListChecks,
  MapPin,
  Navigation,
  PackageCheck,
  RotateCcw,
  Store as StoreIcon,
  TriangleAlert,
} from "lucide-react";
import { useState } from "react";
import { cn } from "../utils/cn";
import { getOffer, getProduct, getStore } from "../data/demo";
import { faFreshness, faKm, faNum, faPriceFull, faWalk, isOpenNow, isStale } from "../lib/fa";
import { FAIL_COPY } from "../lib/ranking";
import { useSession } from "../state/session";
import { TorobGardMascot } from "../components/Mascot";
import { Btn, DemoTag, EmptyState, FreshBadge, StockBadge } from "../components/ui";

export function Summary() {
  const { state, dispatch } = useSession();
  const [copied, setCopied] = useState(false);
  const product = getProduct(state.selectedProductId);
  const store = getStore(state.chosenStoreId);
  const offer = getOffer(state.selectedProductId, state.chosenStoreId);

  if (!product || !store || !offer) {
    return (
      <div className="mx-auto max-w-2xl px-3 py-10 sm:px-5">
        <EmptyState
          title="هنوز برنامه‌ی رفتنی نداری"
          body="وقتی مدل رو انتخاب کنی و فروشگاه مقصد رو مشخص کنی، اینجا چک‌لیست آماده‌سازی قبل از رفتن ساخته می‌شه."
          actions={
            <Btn size="sm" icon={StoreIcon} onClick={() => dispatch({ type: "GO", stage: state.selectedProductId ? "radar" : "products" })}>
              {state.selectedProductId ? "رفتن به رادار فروشگاه" : "رفتن به میز تصمیم"}
            </Btn>
          }
        />
      </div>
    );
  }

  const stale = isStale(offer.updatedMinAgo);
  const open = isOpenNow(store.hours);
  const address = [store.street, store.mall, store.floor, store.unit].filter(Boolean).join("، ");
  const mapsUrl = `https://www.google.com/maps/search/?api=1&query=${store.geo.lat},${store.geo.lng}`;

  const checklist: { ok: boolean | null; label: string; detail: string }[] = [
    offer.stock === "confirmed"
      ? { ok: true, label: "موجودی فروشگاه", detail: "در ثبت ترب تأیید شده — باز هم قطعی نیست (نمایشی)" }
      : offer.stock === "unconfirmed"
        ? { ok: false, label: "موجودی فروشگاه", detail: "قبل از رفتن حتماً چک کن — تازه تأیید نشده" }
        : { ok: null, label: "موجودی فروشگاه", detail: "نامشخص — با ذهنِ «ممکنه نباشه» برو" },
    stale
      ? { ok: false, label: "تازگی قیمت", detail: `آخرین ثبت ${faFreshness(offer.updatedMinAgo)} — ممکنه تغییر کرده باشه` }
      : { ok: true, label: "تازگی قیمت", detail: `به‌روزرسانی ${faFreshness(offer.updatedMinAgo)}` },
    open === null
      ? { ok: null, label: "ساعت کاری", detail: "ثبت نشده — ساعت رو پیشاپیش حدس نزن" }
      : open
        ? { ok: true, label: "ساعت کاری", detail: `الان باز است (${faNum(store.hours!.opens)} تا ${faNum(store.hours!.closes)})` }
        : { ok: false, label: "ساعت کاری", detail: "الان بسته است — ساعت بازگشایی رو چک کن" },
    store.unit || !store.mall
      ? { ok: true, label: "آدرس دقیق", detail: "خیابان/طبقه/واحد در دسترسه" }
      : { ok: false, label: "آدرس دقیق", detail: `طبقه/واحد ثبت نشده — داخل ${store.mall} بپرس` },
    { ok: null, label: "اطلاعات تماس", detail: "در نمونه‌ی نمایشی ثبت نشده — استعلام حضوری/پیام ترب" },
  ];

  return (
    <div className="mx-auto max-w-3xl px-3 pb-16 pt-5 sm:px-5 md:pt-8">
      <div className="anim-rise flex items-start gap-3">
        <TorobGardMascot pose="point" float className="h-24 w-20 shrink-0 sm:h-28 sm:w-24" alt="ترب‌گرد مسیر را نشان می‌دهد" />
        <div className="pt-1 sm:pt-3">
          <div className="flex flex-wrap gap-2">
            <span className="rounded-full bg-mint-tint px-2.5 py-1 text-[10px] font-extrabold text-mint">آماده‌ی رفتن</span>
            <DemoTag />
          </div>
          <h2 className="mt-2 text-xl font-black sm:text-2xl">چک‌لیست قبل از حرکت</h2>
          <p className="mt-1 max-w-md text-[12px] font-medium leading-relaxed text-sub">
            خریدت هنوز «انجام‌نشده» و هیچ فروشگاهی قرار ملاقات قطعی تأیید نکرده؛ این صفحه برنامه‌ی رفتن توست، با ابهام‌هایش.
          </p>
        </div>
      </div>

      {/* product + store cards */}
      <div className="mt-5 grid gap-3 sm:grid-cols-2">
        <div className="anim-rise rounded-3xl border border-line bg-white p-4 shadow-card" style={{ animationDelay: "60ms" }}>
          <p className="flex items-center gap-1.5 text-[10px] font-extrabold text-faint">
            <PackageCheck className="h-3.5 w-3.5" /> مدل انتخابی
          </p>
          <p className="mt-1.5 text-[15px] font-extrabold leading-snug">{product.name}</p>
          <ul className="mt-2 space-y-1">
            {product.specs.slice(0, 3).map((s) => (
              <li key={s.label} className="text-[11px] text-sub">
                <span className="font-bold text-ink">{s.label}:</span> {s.value}
              </li>
            ))}
          </ul>
          <Btn size="sm" variant="ghost" className="mt-2 px-0 text-brand-deep" onClick={() => dispatch({ type: "GO", stage: "products" })}>
            تغییر مدل ←
          </Btn>
        </div>

        <div className="anim-rise rounded-3xl border border-line bg-white p-4 shadow-card" style={{ animationDelay: "120ms" }}>
          <p className="flex items-center gap-1.5 text-[10px] font-extrabold text-faint">
            <StoreIcon className="h-3.5 w-3.5" /> فروشگاه مقصد
          </p>
          <p className="mt-1.5 text-[15px] font-extrabold leading-snug">{store.name}</p>
          <p className="mt-1 flex items-center gap-1 text-[11px] font-semibold text-sub">
            <Footprints className="h-3.5 w-3.5" /> {faKm(store.distanceKm)} · {faWalk(store.distanceKm)}
          </p>
          <Btn size="sm" variant="ghost" className="mt-3 px-0 text-brand-deep" onClick={() => dispatch({ type: "GO", stage: "radar" })}>
            تغییر فروشگاه ←
          </Btn>
        </div>
      </div>

      {/* price & status */}
      <div className="anim-rise mt-3 rounded-3xl border border-line bg-white p-4 shadow-card" style={{ animationDelay: "180ms" }}>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-[10px] font-extrabold text-faint">قیمت ثبت‌شده در ترب</p>
            <p className="mt-0.5 text-2xl font-black tnum">{faPriceFull(offer.priceToman)}</p>
          </div>
          <div className="flex flex-wrap gap-1.5">
            <StockBadge stock={offer.stock} />
            <FreshBadge stale={stale} text={`به‌روزرسانی ${faFreshness(offer.updatedMinAgo)}`} />
            {store.installment === true && (
              <span className="inline-flex items-center gap-1 rounded-full bg-cloud px-2 py-1 text-[10px] font-bold text-sky-ink">
                <Banknote className="h-3 w-3" /> فروش اقساطی
              </span>
            )}
          </div>
        </div>
        <p className="mt-2 text-[10px] font-medium leading-relaxed text-sub">
          مبنای قیمت: «{offer.sourceNote}» — قیمت نمایشیِ ثبت‌شده، نه تضمین فروش نهایی.
        </p>
      </div>

      {/* address & route */}
      <div className="anim-rise mt-3 rounded-3xl border border-line bg-white p-4 shadow-card" style={{ animationDelay: "240ms" }}>
        <div className="flex items-center justify-between">
          <p className="flex items-center gap-1.5 text-[10px] font-extrabold text-faint">
            <MapPin className="h-3.5 w-3.5" /> آدرس
          </p>
          {open !== null && (
            <span className={cn("rounded-full px-2 py-1 text-[10px] font-bold", open ? "bg-mint-tint text-mint" : "bg-black/5 text-sub")}>
              <Clock3 className="mr-1 inline h-3 w-3" />{open ? "الان باز است" : "الان بسته است"}
            </span>
          )}
        </div>
        <p className={cn("mt-2 text-[13px] font-semibold leading-loose", !address && "text-ambery")}>
          {address || "آدرس دقیق در داده‌ی نمایشی ثبت نشده است."}
        </p>
        {store.mall && !store.unit && (
          <p className="mt-1 flex items-center gap-1 text-[10px] font-bold text-ambery">
            <TriangleAlert className="h-3.5 w-3.5" /> شماره‌ی واحد ثبت نشده — از اطلاعات {store.mall} بپرس.
          </p>
        )}
        <div className="mt-3 flex flex-wrap gap-2">
          <Btn
            size="sm"
            icon={Navigation}
            onClick={() => window.open(mapsUrl, "_blank", "noopener")}
          >
            باز کردن مسیر در نقشه
          </Btn>
          <Btn
            size="sm"
            variant="outline"
            icon={Copy}
            onClick={() => {
              navigator.clipboard?.writeText(`${store.name} — ${address || store.neighborhood}`).catch(() => {});
              setCopied(true);
              setTimeout(() => setCopied(false), 1800);
            }}
          >
            {copied ? "کپی شد" : "کپی آدرس"}
          </Btn>
          <span className="self-center text-[9px] font-semibold text-faint">مختصات لینک نقشه نمایشی است؛ مسیریابی واقعی در نسخه‌ی محصول انجام می‌شود.</span>
        </div>
      </div>

      {/* checklist */}
      <div className="anim-rise mt-3 rounded-3xl border border-line bg-white p-4 shadow-card" style={{ animationDelay: "300ms" }}>
        <p className="flex items-center gap-1.5 text-[11px] font-extrabold">
          <ListChecks className="h-4 w-4 text-brand-deep" /> چک‌لیست واقع‌بینانه
        </p>
        <div className="mt-2 divide-y divide-line/60">
          {checklist.map((c) => (
            <div key={c.label} className="flex items-start gap-2.5 py-2.5">
              <span
                className={cn(
                  "mt-0.5 grid h-6 w-6 shrink-0 place-items-center rounded-full",
                  c.ok === true && "bg-mint-tint text-mint",
                  c.ok === false && "bg-amber-tint text-ambery",
                  c.ok === null && "bg-black/5 text-faint"
                )}
              >
                {c.ok === true && <CircleCheck className="h-4 w-4" />}
                {c.ok === false && <TriangleAlert className="h-4 w-4" />}
                {c.ok === null && <CircleDashed className="h-4 w-4" />}
              </span>
              <div className="flex-1">
                <p className="text-[12px] font-extrabold">{c.label}</p>
                <p className="text-[10px] font-medium leading-relaxed text-sub">{c.detail}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* recovery history */}
      {state.failures.length > 0 && (
        <div className="anim-rise mt-3 rounded-3xl border border-line bg-white p-4 shadow-card" style={{ animationDelay: "360ms" }}>
          <p className="text-[11px] font-extrabold">روایت این سفر (سابقه):</p>
          <ul className="mt-2 space-y-1.5">
            {state.failures.map((f) => {
              const fs = getStore(f.storeId);
              return (
                <li key={f.storeId + f.at} className="text-[11px] font-medium leading-relaxed text-sub">
                  <span className="font-bold text-ink">{fs?.name}</span> — {FAIL_COPY[f.reason].title}؛ با پلن B مدیریت شد (نمایشی).
                </li>
              );
            })}
            <li className="text-[11px] font-medium text-sub">
              مقصد نهایی: <span className="font-bold text-mint">{store.name}</span>
            </li>
          </ul>
        </div>
      )}

      {/* restart */}
      <div className="anim-rise mt-5 flex flex-wrap items-center gap-2" style={{ animationDelay: "420ms" }}>
        <Btn variant="secondary" icon={RotateCcw} onClick={() => dispatch({ type: "RESET" })}>
          شروع دوباره‌ی سفر با ترب‌گرد
        </Btn>
        <p className="text-[10px] font-medium text-sub">
          {faNum(9)} مرحله‌ی مسیر نمایشی را طی کردی؛ برای ارائه‌ی مجدد، همه‌چیز ریست می‌شود.
        </p>
      </div>
    </div>
  );
}
