import {
  Banknote,
  CircleAlert,
  CircleX,
  Clock3,
  List,
  Map as MapIcon,
  MapPin,
  Navigation,
  PackageX,
  Pencil,
  PhoneOff,
  Radio,
  SlidersHorizontal,
} from "lucide-react";
import { useMemo, useState } from "react";
import { cn } from "../utils/cn";
import { getOffer, getProduct, getStore } from "../data/demo";
import {
  faFreshness,
  faKm,
  faNum,
  faPrice,
  faPriceFull,
  faWalk,
  isOpenNow,
  isStale,
} from "../lib/fa";
import {
  activeFilterCount,
  applyFilters,
  FAIL_COPY,
  rowsForProduct,
  sortRows,
  type OfferRow,
} from "../lib/ranking";
import { useSession } from "../state/session";
import type { SortKey } from "../lib/types";
import { Btn, DemoTag, EmptyState, FreshBadge, Sheet, StockBadge } from "../components/ui";
import { MapView } from "../components/MapView";

const SORTS: { key: SortKey; label: string }[] = [
  { key: "price", label: "کمترین قیمت ثبت‌شده" },
  { key: "distance", label: "نزدیک‌ترین" },
  { key: "freshness", label: "تازه‌ترین اطلاعات" },
];

export function Radar() {
  const { state, dispatch } = useSession();
  const [filtersOpen, setFiltersOpen] = useState(false);
  const product = getProduct(state.selectedProductId);

  const allRows = useMemo(() => rowsForProduct(state.selectedProductId), [state.selectedProductId]);
  const rows = useMemo(
    () => sortRows(applyFilters(allRows, state.filters), state.sort),
    [allRows, state.filters, state.sort]
  );
  const failedIds = state.failures.map((f) => f.storeId);

  /* price ceilings derived from the actual offer spread of this product */
  const priceSteps = useMemo(() => {
    const prices = [...allRows.map((r) => r.offer.priceToman)].sort((a, b) => a - b);
    if (!prices.length) return [];
    const at = (q: number) => prices[Math.min(prices.length - 1, Math.floor(prices.length * q))];
    const opts = [at(0), at(0.5), at(0.85)]
      .filter((v, i, arr) => arr.indexOf(v) === i)
      .map((v) => ({ v, l: `تا ${faPrice(v)}` }));
    return [{ v: null as number | null, l: "مهم نیست" }, ...opts];
  }, [allRows]);

  if (!product) {
    return (
      <div className="mx-auto max-w-2xl px-3 py-10 sm:px-5">
        <EmptyState
          title="هنوز مدلی انتخاب نکردی"
          body="رادار فروشگاه برای مدلِ انتخابی‌ات کار می‌کنه؛ اول از میز تصمیم یکی از سه استراتژی رو برگزین."
          actions={
            <Btn size="sm" icon={Pencil} onClick={() => dispatch({ type: "GO", stage: "products" })}>
              برگشت به میز تصمیم
            </Btn>
          }
        />
      </div>
    );
  }

  const fCount = activeFilterCount(state.filters);

  return (
    <div className="mx-auto max-w-6xl px-3 pb-10 pt-5 sm:px-5 md:pt-8">
      {/* context header */}
      <div className="anim-rise mb-4 flex flex-wrap items-center gap-3 rounded-3xl border border-line bg-white p-3.5 shadow-card">
        <span className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl bg-brand-tint text-brand-deep">
          <Radio className="h-5 w-5" />
        </span>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-extrabold leading-snug">
            رادار فروشگاه — {product.name}
          </p>
          <p className="text-[11px] font-medium text-sub">
            {faNum(allRows.length)} پیشنهاد در نزدیکی‌ات (نمایشی) · قیمت‌ها آخرین «ثبت فروشگاه»‌اند و تضمینی برای به‌روزی نیست
          </p>
        </div>
        <Btn size="sm" variant="outline" icon={Pencil} onClick={() => dispatch({ type: "GO", stage: "products" })}>
          تغییر مدل
        </Btn>
      </div>

      {/* toolbar */}
      <div className="anim-rise mb-4 flex flex-wrap items-center gap-2">
        {/* view switch (mobile) */}
        <div className="flex rounded-full border border-line bg-white p-1 md:hidden" role="tablist" aria-label="حالت نمایش">
          {(
            [
              { v: "map", label: "نقشه", Icon: MapIcon },
              { v: "list", label: "لیست", Icon: List },
            ] as const
          ).map((o) => (
            <button
              key={o.v}
              role="tab"
              aria-selected={state.radarView === o.v}
              onClick={() => dispatch({ type: "SET_VIEW", view: o.v })}
              className={cn(
                "focusable flex items-center gap-1 rounded-full px-3 py-1.5 text-[11px] font-bold transition",
                state.radarView === o.v ? "bg-ink text-white" : "text-sub"
              )}
            >
              <o.Icon className="h-3.5 w-3.5" /> {o.label}
            </button>
          ))}
        </div>

        <Btn
          size="sm"
          variant={filtersOpen || fCount > 0 ? "secondary" : "outline"}
          icon={SlidersHorizontal}
          onClick={() => setFiltersOpen(!filtersOpen)}
          className="rounded-full"
        >
          فیلترها {fCount > 0 && <span className="grid h-4.5 w-4.5 place-items-center rounded-full bg-brand text-[10px] text-white">{faNum(fCount)}</span>}
        </Btn>

        {/* sort */}
        <div className="nice-scroll flex items-center gap-1 overflow-x-auto rounded-full border border-line bg-white p-1">
          {SORTS.map((s) => (
            <button
              key={s.key}
              onClick={() => dispatch({ type: "SET_SORT", sort: s.key })}
              className={cn(
                "focusable whitespace-nowrap rounded-full px-3 py-1.5 text-[11px] font-bold transition",
                state.sort === s.key ? "bg-brand text-white" : "text-sub hover:text-ink"
              )}
            >
              {s.label}
            </button>
          ))}
        </div>
      </div>

      {/* filters panel */}
      {filtersOpen && (
        <div className="anim-rise mb-4 grid gap-4 rounded-3xl border border-line bg-white p-4 shadow-card sm:grid-cols-2 lg:grid-cols-4">
          <FilterGroup title="سقف قیمت (تومان)">
            {priceSteps.map((o) => (
              <FilterPill key={o.l} active={state.filters.maxPrice === o.v} onClick={() => dispatch({ type: "SET_FILTERS", patch: { maxPrice: o.v } })}>
                {o.l}
              </FilterPill>
            ))}
          </FilterGroup>
          <FilterGroup title="فاصله از تو">
            {[
              { v: null, l: "هرجا" },
              { v: 1, l: "تا ۱ کیلومتر" },
              { v: 2, l: "تا ۲ کیلومتر" },
              { v: 5, l: "تا ۵ کیلومتر" },
            ].map((o) => (
              <FilterPill key={o.l} active={state.filters.maxDistanceKm === o.v} onClick={() => dispatch({ type: "SET_FILTERS", patch: { maxDistanceKm: o.v } })}>
                {o.l}
              </FilterPill>
            ))}
          </FilterGroup>
          <FilterGroup title="ساعت کاری">
            <FilterPill active={!state.filters.openNow} onClick={() => dispatch({ type: "SET_FILTERS", patch: { openNow: false } })}>
              مهم نیست
            </FilterPill>
            <FilterPill active={state.filters.openNow} onClick={() => dispatch({ type: "SET_FILTERS", patch: { openNow: true } })}>
              فقط «الان باز» (اگر ثبت شده)
            </FilterPill>
          </FilterGroup>
          <FilterGroup title="اقساط">
            <FilterPill active={!state.filters.installment} onClick={() => dispatch({ type: "SET_FILTERS", patch: { installment: false } })}>
              مهم نیست
            </FilterPill>
            <FilterPill active={state.filters.installment} onClick={() => dispatch({ type: "SET_FILTERS", patch: { installment: true } })}>
              فقط دارای فروش اقساطی
            </FilterPill>
          </FilterGroup>
        </div>
      )}

      {/* map + list */}
      <div className="grid gap-4 md:grid-cols-[1.25fr_1fr]">
        <div className={cn("md:block", state.radarView === "list" && "hidden")}>
          <MapView
            rows={rows}
            selectedId={state.selectedStoreId ?? state.chosenStoreId}
            failedIds={failedIds}
            radiusKm={state.filters.maxDistanceKm}
            onSelect={(id) => dispatch({ type: "OPEN_STORE", id })}
            className="aspect-[4/3] md:aspect-auto md:h-full md:min-h-[520px]"
          />
        </div>

        <div className={cn("flex flex-col gap-2.5 md:block", state.radarView === "map" && "hidden md:flex")}>
          <p className="px-1 text-[11px] font-bold text-sub">
            {rows.length > 0 ? `${faNum(rows.length)} فروشگاه — مرتب‌شده بر اساس «${SORTS.find((s) => s.key === state.sort)!.label}»` : ""}
            {failedIds.length > 0 && <span className="ms-2 text-ambery">({faNum(failedIds.length)} فروشگاه در این سفر رد شده)</span>}
          </p>
          <div className="nice-scroll flex max-h-[560px] flex-col gap-2.5 overflow-y-auto pb-2">
            {rows.length === 0 && (
              <EmptyState
                compact
                title="هیچ فروشگاهی با این فیلترها جور در نمی‌آد"
                body="مدلت دست‌نخورده؛ فقط محدوده رو جمع‌وجورتر کن. پیشنهاد می‌کنم سقف فاصله یا قیمت رو کمی بازتر کنی."
                actions={
                  <Btn size="sm" variant="outline" onClick={() => dispatch({ type: "SET_FILTERS", patch: { maxPrice: null, maxDistanceKm: null, openNow: false, installment: false } })}>
                    حذف همه‌ی فیلترها
                  </Btn>
                }
              />
            )}
            {rows.map((r, i) => (
              <StoreRowCard
                key={r.store.id}
                row={r}
                rank={i + 1}
                failed={failedIds.includes(r.store.id)}
                chosen={state.chosenStoreId === r.store.id}
                onOpen={() => dispatch({ type: "OPEN_STORE", id: r.store.id })}
              />
            ))}
          </div>
        </div>
      </div>

      <StoreDetailSheet product={state.selectedProductId} />
    </div>
  );
}

/* ------------------------------ filter bits ------------------------------ */

function FilterGroup({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <fieldset>
      <legend className="mb-2 text-[11px] font-extrabold text-sub">{title}</legend>
      <div className="flex flex-wrap gap-1.5">{children}</div>
    </fieldset>
  );
}

function FilterPill({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "focusable rounded-full border px-3 py-1.5 text-[11px] font-bold transition active:scale-95",
        active ? "border-brand bg-brand text-white" : "border-line bg-white text-sub hover:border-brand/50 hover:text-ink"
      )}
    >
      {children}
    </button>
  );
}

/* ------------------------------ list card ------------------------------ */

function StoreRowCard({
  row,
  rank,
  failed,
  chosen,
  onOpen,
}: {
  row: OfferRow;
  rank: number;
  failed: boolean;
  chosen: boolean;
  onOpen: () => void;
}) {
  const { offer, store } = row;
  const stale = isStale(offer.updatedMinAgo);
  const open = isOpenNow(store.hours);
  return (
    <button
      type="button"
      onClick={onOpen}
      className={cn(
        "focusable anim-rise rounded-3xl border bg-white p-3.5 text-right shadow-card transition hover:-translate-y-0.5 hover:shadow-pop",
        chosen ? "border-mint ring-1 ring-mint/40" : "border-line",
        failed && "opacity-60"
      )}
    >
      <div className="flex items-start gap-3">
        <span
          className={cn(
            "grid h-8 w-8 shrink-0 place-items-center rounded-full text-[12px] font-black",
            failed ? "bg-faint/20 text-faint" : rank === 1 ? "bg-brand text-white" : "bg-cream text-ink ring-1 ring-line"
          )}
        >
          {failed ? "×" : faNum(rank)}
        </span>
        <div className="min-w-0 flex-1">
          <div className="flex items-center justify-between gap-2">
            <p className="truncate text-[13px] font-extrabold">{store.name}</p>
            <p className="shrink-0 text-[15px] font-black tnum">{faPrice(offer.priceToman)}</p>
          </div>
          <p className="mt-0.5 flex items-center gap-1 text-[10px] font-medium text-sub">
            <MapPin className="h-3 w-3 shrink-0" />
            <span className="truncate">{store.mall ? `${store.mall} · ` : ""}{store.neighborhood}</span>
            <span className="shrink-0">· {faKm(store.distanceKm)} ({faWalk(store.distanceKm)})</span>
          </p>
          <div className="mt-2 flex flex-wrap items-center gap-1.5">
            <StockBadge stock={offer.stock} compact />
            <FreshBadge stale={stale} text={`قیمت: ${faFreshness(offer.updatedMinAgo)}`} />
            {open === true && <span className="rounded-full bg-mint-tint px-2 py-1 text-[10px] font-bold text-mint">الان باز</span>}
            {open === false && <span className="rounded-full bg-black/5 px-2 py-1 text-[10px] font-bold text-sub">بسته</span>}
            {store.installment === true && (
              <span className="inline-flex items-center gap-1 rounded-full bg-cloud px-2 py-1 text-[10px] font-bold text-sky-ink">
                <Banknote className="h-3 w-3" /> اقساط
              </span>
            )}
            {failed && <span className="rounded-full bg-amber-tint px-2 py-1 text-[10px] font-bold text-ambery">رد شده در این سفر</span>}
          </div>
        </div>
      </div>
    </button>
  );
}

/* --------------------------- store detail sheet --------------------------- */

export function StoreDetailSheet({ product }: { product: string | null }) {
  const { state, dispatch } = useSession();
  const store = getStore(state.selectedStoreId);
  const offer = getOffer(product, state.selectedStoreId);
  if (!store || !offer) return null;

  const failed = state.failures.find((f) => f.storeId === store.id);
  const open = isOpenNow(store.hours);
  const stale = isStale(offer.updatedMinAgo);
  const fullAddress = [store.street, store.mall, store.floor, store.unit ? store.unit : null].filter(Boolean).join("، ");

  return (
    <Sheet open onClose={() => dispatch({ type: "OPEN_STORE", id: null })} labelledby="store-sheet-title">
      <div className="pe-10">
        <h3 id="store-sheet-title" className="text-lg font-extrabold leading-snug">{store.name}</h3>
        <p className="mt-0.5 flex items-center gap-1 text-[11px] font-semibold text-sub">
          <MapPin className="h-3.5 w-3.5" /> {store.neighborhood} · {faKm(store.distanceKm)} · {faWalk(store.distanceKm)}
        </p>
      </div>

      {failed && (
        <div className="mt-3 flex items-start gap-2 rounded-2xl bg-amber-tint p-3 text-[11px] font-semibold leading-relaxed text-ambery">
          <CircleAlert className="mt-0.5 h-4 w-4 shrink-0" />
          این فروشگاه رو همین الان توی این سفر رد کردی ({FAIL_COPY[failed.reason].title}) — سابقه‌ی تصمیم‌هات حفظ شده.
        </div>
      )}

      {/* offer facts */}
      <div className="mt-4 grid gap-2.5 sm:grid-cols-2">
        <div className="rounded-2xl border border-line bg-white p-3.5">
          <p className="text-[10px] font-bold text-faint">قیمت ثبت‌شده</p>
          <p className="mt-1 text-xl font-black tnum">{faPriceFull(offer.priceToman)}</p>
          <div className="mt-2 flex flex-wrap gap-1.5">
            <FreshBadge stale={stale} text={faFreshness(offer.updatedMinAgo)} />
            <span className="rounded-full bg-black/5 px-2 py-1 text-[10px] font-semibold text-sub">{offer.sourceNote}</span>
          </div>
          <p className="mt-2 text-[10px] font-medium leading-relaxed text-sub">
            این عدد آخرین <b>قیمتِ ثبت‌شده</b> است، نه تضمین فروش؛ پیش از پرداخت حتما استعلام کن.
          </p>
        </div>
        <div className="rounded-2xl border border-line bg-white p-3.5">
          <p className="text-[10px] font-bold text-faint">وضعیت موجودی</p>
          <div className="mt-2"><StockBadge stock={offer.stock} /></div>
          <p className="mt-2 text-[10px] font-medium leading-relaxed text-sub">
            {offer.stock === "confirmed"
              ? "ثبت موجودی اخیرا تأیید شده (در دنیای واقعی هم به معنای قطعیت نیست)."
              : offer.stock === "unconfirmed"
                ? "ثبت موجودی قدیمی است و فروشگاه تازه تأیید نکرده؛ احتمال ناموجودی هست."
                : "هیچ ثبت موجودی قابل اتکایی وجود ندارد — از وجود محصول استنباط موجودی نکن."}
          </p>
          <div className="mt-3 flex items-center gap-2 rounded-xl bg-cream/70 px-3 py-2 text-[10px] font-bold text-sub">
            <PhoneOff className="h-3.5 w-3.5" /> اطلاعات تماس: ثبت نشده (در نمونه‌ی نمایشی عمدا خالی است)
          </div>
        </div>
      </div>

      {/* address & hours */}
      <div className="mt-2.5 rounded-2xl border border-line bg-white p-3.5">
        <div className="flex items-center justify-between">
          <p className="text-[10px] font-bold text-faint">آدرس و ساعت</p>
          {open !== null && (
            <span className={cn("rounded-full px-2 py-1 text-[10px] font-bold", open ? "bg-mint-tint text-mint" : "bg-black/5 text-sub")}>
              <Clock3 className="mr-1 inline h-3 w-3" />
              {open ? "الان باز است" : "الان بسته است"}
            </span>
          )}
        </div>
        {fullAddress ? (
          <p className="mt-2 text-[12px] font-semibold leading-loose">{fullAddress}</p>
        ) : (
          <p className="mt-2 text-[12px] font-semibold leading-loose text-ambery">آدرس دقیق ثبت نشده است.</p>
        )}
        {store.mall && !store.unit && (
          <p className="mt-1 flex items-center gap-1 text-[10px] font-bold text-ambery">
            <CircleAlert className="h-3.5 w-3.5" /> طبقه/واحد ثبت نشده — حتما داخل {store.mall} بپرس.
          </p>
        )}
        <div className="mt-2 flex flex-wrap gap-1.5 text-[10px] font-semibold text-sub">
          {store.hours ? (
            <span className="rounded-full bg-cream px-2.5 py-1">
              {faNum(store.hours.opens)} تا {faNum(store.hours.closes)}
              {store.hours.fridayNote ? ` · ${store.hours.fridayNote}` : ""}
            </span>
          ) : (
            <span className="rounded-full bg-cream px-2.5 py-1">ساعت کاری: ثبت نشده</span>
          )}
          {store.installment === true && (
            <span className="inline-flex items-center gap-1 rounded-full bg-cloud px-2.5 py-1 text-sky-ink">
              <Banknote className="h-3 w-3" /> فروش اقساطی
            </span>
          )}
          {store.installment === null && <span className="rounded-full bg-cream px-2.5 py-1">اقساط: نامشخص</span>}
        </div>
      </div>

      {/* primary decision */}
      <div className="sticky bottom-0 mt-4 space-y-2 border-t border-line bg-cream/95 pt-3 backdrop-blur">
        <Btn className="w-full" size="lg" icon={Navigation} onClick={() => dispatch({ type: "CHOOSE_STORE", id: store.id })}>
          برنامه‌ی من: همین فروشگاه
        </Btn>

        {/* failure triggers — honestly labeled as simulation */}
        <div className="rounded-2xl border border-dashed border-brand/35 bg-brand-tint/40 p-3">
          <p className="mb-2 flex items-center gap-2 text-[10px] font-extrabold text-brand-deep">
            کنترل‌های شبیه‌سازی ایراد <DemoTag />
          </p>
          <div className="grid grid-cols-3 gap-1.5">
            <Btn size="sm" variant="danger" icon={PhoneOff} onClick={() => dispatch({ type: "FAIL_STORE", reason: "no-answer" })}>
              جواب نداد
            </Btn>
            <Btn size="sm" variant="danger" icon={PackageX} onClick={() => dispatch({ type: "FAIL_STORE", reason: "stock" })}>
              موجودی تأیید نشد
            </Btn>
            <Btn size="sm" variant="danger" icon={CircleX} onClick={() => dispatch({ type: "FAIL_STORE", reason: "closed" })}>
              بسته بود
            </Btn>
          </div>
          <p className="mt-2 text-[9px] leading-relaxed text-sub">
            با هرکدام، «پلن B هوشمند» فعال می‌شود — رویداد کاملا نمایشی است.
          </p>
        </div>
      </div>
    </Sheet>
  );
}
