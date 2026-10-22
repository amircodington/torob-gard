import {
  CircleCheck,
  Gauge,
  Headphones,
  Laptop,
  Minus,
  Pencil,
  Plus,
  Scale,
  ShoppingBag,
  Smartphone,
  Sparkles,
  Store,
  TrendingDown,
} from "lucide-react";
import { useState } from "react";
import { cn } from "../utils/cn";
import { minPriceOffer, offersFor, productsOfCategory, PRODUCTS } from "../data/demo";
import { faFreshness, faNum, faPrice, isStale } from "../lib/fa";
import { reqBudget, reqPriority, useSession } from "../state/session";
import type { Product, Tier } from "../lib/types";
import { TorobGardMascot } from "../components/Mascot";
import { Btn, DemoTag, EmptyState, FreshBadge, SectionHead, Sheet } from "../components/ui";

const TIER_META: Record<Tier, { label: string; sub: string; cls: string }> = {
  budget: { label: "اقتصادی", sub: "بیشترین صرفه‌جویی", cls: "bg-mint-tint text-mint" },
  balanced: { label: "متعادل و مناسب نیاز", sub: "بهترین تناسب با حرف‌هایت", cls: "bg-brand-tint text-brand-deep" },
  feature: { label: "امکانات بیشتر", sub: "سقفِ تجربه، به قیمتش", cls: "bg-cloud text-sky-ink" },
};

const CAT_ICON = { mobile: Smartphone, laptop: Laptop, accessory: Headphones, other: ShoppingBag } as const;

function ProductPlaceholder({ p, className }: { p: Product; className?: string }) {
  const Icon = CAT_ICON[p.category];
  return (
    <div className={cn("relative grid place-items-center overflow-hidden rounded-2xl bg-mascot", className)}>
      <Icon className="h-10 w-10 text-faint/70" strokeWidth={1.4} />
      <span className="absolute bottom-1.5 rounded-full bg-white/85 px-2 py-0.5 text-[9px] font-semibold text-faint backdrop-blur">
        تصویر محصول — نمایشی
      </span>
    </div>
  );
}

export function Products() {
  const { state, dispatch } = useSession();
  const [whyOpen, setWhyOpen] = useState<string | null>(null);
  const [compareOpen, setCompareOpen] = useState(false);

  const budget = reqBudget(state.req);
  const prio = reqPriority(state.req);
  const items = productsOfCategory(state.req.category);

  /* designed empty state: category without demo coverage */
  if (!state.req.category || state.req.category === "other" || items.length === 0) {
    return (
      <div className="mx-auto max-w-2xl px-3 py-10 sm:px-5">
        <EmptyState
          title="برای این دسته هنوز داده‌ی نمایشی کامل نداریم"
          body="نسخه‌ی هکاتون ترب‌گرد روی دسته‌های «موبایل»، «لپ‌تاپ» و «لوازم جانبی» متمرکزه. نیازهات حفظ شدن؛ با انتخاب یکی از این دسته‌ها بدون از دست دادن جلسه ادامه بده."
          actions={
            <>
              <Btn size="sm" onClick={() => dispatch({ type: "CHAT_CHIP", chip: { id: "cat:mobile", label: "موبایل" } })}>
                رفتن به دسته‌ی موبایل
              </Btn>
              <Btn size="sm" variant="outline" icon={Pencil} onClick={() => dispatch({ type: "GO", stage: "consult" })}>
                ویرایش نیازها
              </Btn>
            </>
          }
        />
      </div>
    );
  }

  const ranked = (tier: Tier) => items.find((p) => p.tier === tier)!;
  const tiers: Tier[] = ["budget", "balanced", "feature"];

  return (
    <div className="mx-auto max-w-6xl px-3 pb-28 pt-5 sm:px-5 md:pt-8">
      {/* head + requirement memory */}
      <div className="anim-rise mb-5 flex flex-wrap items-start gap-4">
        <TorobGardMascot pose="idle" className="hidden h-24 w-20 shrink-0 sm:block" />
        <div className="min-w-0 flex-1">
          <SectionHead
            icon={Sparkles}
            title="میز تصمیم — سه راه جلوی پاته"
            sub="خودم خودسرانه «بهترین» رو انتخاب نمی‌کنم؛ بر اساس چیزهایی که گفتی، هر استراتژی یک مصالحه‌ی متفاوته."
          />
          <div className="mt-3 flex flex-wrap items-center gap-1.5">
            <span className="rounded-full bg-ink px-2.5 py-1 text-[10px] font-bold text-white">
              {state.req.goalText || "نیاز نامشخص"}
            </span>
            <span className="rounded-full bg-white px-2.5 py-1 text-[10px] font-bold text-sub ring-1 ring-line">
              بودجه: {budget ? budget.label : "مشخص نشده"}
            </span>
            <span className="rounded-full bg-white px-2.5 py-1 text-[10px] font-bold text-sub ring-1 ring-line">
              اولویت: {prio ? prio.label : "مشخص نشده"}
            </span>
            <button
              type="button"
              onClick={() => dispatch({ type: "GO", stage: "consult" })}
              className="focusable inline-flex items-center gap-1 rounded-full px-2 py-1 text-[10px] font-bold text-brand-deep hover:bg-brand-tint"
            >
              <Pencil className="h-3 w-3" /> ویرایش
            </button>
          </div>
        </div>
        <DemoTag className="shrink-0" />
      </div>

      {/* strategy cards */}
      <div className="grid gap-4 md:grid-cols-3">
        {tiers.map((tier, i) => {
          const p = ranked(tier);
          const meta = TIER_META[tier];
          const offers = offersFor(p.id);
          const min = minPriceOffer(p.id);
          const selected = state.selectedProductId === p.id;
          const inCompare = state.compare.includes(p.id);
          const fitsPriority = !!(prio && p.keywords.includes(prio.id));
          return (
            <article
              key={p.id}
              className={cn(
                "anim-rise flex flex-col rounded-3xl border bg-white p-4 shadow-card transition",
                selected ? "border-brand ring-2 ring-brand/30" : "border-line"
              )}
              style={{ animationDelay: `${i * 70}ms` }}
            >
              <div className="flex items-start justify-between gap-2">
                <span className={cn("rounded-full px-2.5 py-1 text-[10px] font-extrabold", meta.cls)}>{meta.label}</span>
                {tier === "balanced" && (
                  <span className="rounded-full bg-ink px-2 py-1 text-[9px] font-bold text-white">پیشنهاد ترب‌گرد</span>
                )}
                {tier === "budget" && min && (
                  <span className="inline-flex items-center gap-1 rounded-full bg-mint-tint px-2 py-1 text-[9px] font-bold text-mint">
                    <TrendingDown className="h-3 w-3" /> کم‌هزینه‌ترین مسیر
                  </span>
                )}
              </div>

              <div className="mt-3 flex items-start gap-3">
                <ProductPlaceholder p={p} className="h-24 w-20 shrink-0" />
                <div className="min-w-0">
                  <h3 className="text-[15px] font-extrabold leading-snug">{p.name}</h3>
                  <ul className="mt-1.5 space-y-1">
                    {p.specs.slice(0, 3).map((s) => (
                      <li key={s.label} className="flex items-baseline gap-1.5 text-[11px] text-sub">
                        <span className="font-bold text-ink">{s.label}:</span> {s.value}
                      </li>
                    ))}
                  </ul>
                </div>
              </div>

              {/* price — sourced only from demo offers */}
              <div className="mt-3 rounded-2xl bg-cream/70 p-3">
                {min ? (
                  <>
                    <div className="flex items-baseline justify-between gap-2">
                      <span className="text-lg font-black tnum">{faPrice(min.priceToman)}</span>
                      <span className="text-[10px] font-semibold text-sub">از {faNum(offers.length)} فروشگاه</span>
                    </div>
                    <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
                      <FreshBadge stale={isStale(min.updatedMinAgo)} text={`کمترین قیمت: ${faFreshness(min.updatedMinAgo)}`} />
                      {isStale(min.updatedMinAgo) && <span className="text-[9px] font-semibold text-ambery">ممکن است به‌روز نباشد</span>}
                    </div>
                  </>
                ) : (
                  <p className="text-[11px] font-semibold text-ambery">پیشنهاد قیمتی در داده‌ی نمایشی ثبت نشده</p>
                )}
              </div>

              <p className="mt-3 text-[12px] font-medium leading-relaxed text-sub">{p.fitNote}</p>
              {fitsPriority && prio && (
                <p className="mt-2 flex items-center gap-1 text-[11px] font-bold text-mint">
                  <CircleCheck className="h-3.5 w-3.5" /> با اولویتت ({prio.label}) هم‌خوانی مستقیم داره
                </p>
              )}

              {/* why this option */}
              <button
                type="button"
                onClick={() => setWhyOpen(whyOpen === p.id ? null : p.id)}
                className="focusable mt-3 flex items-center justify-between rounded-xl border border-dashed border-line px-3 py-2 text-[12px] font-bold text-ink transition hover:border-brand/50 hover:text-brand-deep"
              >
                چرا این گزینه؟
                <span className={cn("transition-transform", whyOpen === p.id && "rotate-45")}>
                  <Plus className="h-4 w-4" />
                </span>
              </button>
              {whyOpen === p.id && (
                <div className="anim-rise mt-2 space-y-2 rounded-xl bg-cream/60 p-3">
                  {p.bullets.map((b) => (
                    <p key={b} className="flex items-start gap-1.5 text-[11px] leading-relaxed text-ink">
                      <CircleCheck className="mt-0.5 h-3.5 w-3.5 shrink-0 text-mint" /> {b}
                    </p>
                  ))}
                  <p className="pt-1 text-[10px] font-extrabold text-faint">کجا کوتاه می‌آد (صادقانه):</p>
                  {p.tradeoffs.map((t) => (
                    <p key={t} className="flex items-start gap-1.5 text-[11px] leading-relaxed text-sub">
                      <Minus className="mt-0.5 h-3.5 w-3.5 shrink-0 text-ambery" /> {t}
                    </p>
                  ))}
                </div>
              )}

              <div className="mt-auto flex gap-2 pt-4">
                <Btn
                  className="flex-1"
                  variant={selected ? "secondary" : "primary"}
                  icon={selected ? CircleCheck : Store}
                  onClick={() => dispatch({ type: "SELECT_PRODUCT", id: p.id, advance: true })}
                >
                  {selected ? "انتخاب شد — رادار فروشگاه" : "انتخاب این مدل"}
                </Btn>
                <Btn
                  variant="outline"
                  size="md"
                  icon={inCompare ? Minus : Plus}
                  aria-label="افزودن به مقایسه"
                  className={cn(inCompare && "border-brand/60 bg-brand-tint text-brand-deep")}
                  onClick={() => dispatch({ type: "TOGGLE_COMPARE", id: p.id })}
                >
                  مقایسه
                </Btn>
              </div>
            </article>
          );
        })}
      </div>

      <p className="mt-4 flex items-center gap-1.5 text-[10px] font-medium leading-relaxed text-faint">
        <Gauge className="h-3.5 w-3.5 shrink-0" />
        قیمت‌ها «آخرین قیمتِ ثبت‌شده‌ی فروشگاه» در این دیتاست نمایشی‌اند و به‌روز بودنشان تضمین نمی‌شود؛ مثل دنیای واقعی.
      </p>

      {/* compare tray */}
      {state.compare.length >= 2 && (
        <div className="anim-sheet fixed inset-x-0 bottom-0 z-30 mx-auto w-full max-w-2xl p-3">
          <div className="flex items-center gap-3 rounded-2xl border border-line bg-ink px-4 py-3 text-white shadow-pop">
            <Scale className="h-5 w-5 shrink-0 text-brand-tint2" />
            <p className="flex-1 text-[12px] font-bold">
              {faNum(state.compare.length)} مدل برای مقایسه آماده‌ست
              <span className="block text-[10px] font-medium text-white/60">مصالحه‌ها رو شفاف می‌بینی، نه تبلیغ</span>
            </p>
            <Btn size="sm" variant="primary" onClick={() => setCompareOpen(true)}>
              باز کردن مقایسه
            </Btn>
          </div>
        </div>
      )}

      {/* compare sheet */}
      <Sheet open={compareOpen} onClose={() => setCompareOpen(false)} labelledby="compare-title">
        <div className="pe-10">
          <h3 id="compare-title" className="text-lg font-extrabold">مقایسه‌ی رو در رو</h3>
          <p className="mt-1 text-[11px] leading-relaxed text-sub">
            هیچ‌کدام «بهترینِ مطلق» نیستند؛ هر کدام یک مصالحه‌ی متفاوت با نیازهای توست.
          </p>
        </div>
        <CompareTable ids={state.compare} prioId={state.req.priorityId} onPick={(id) => { setCompareOpen(false); dispatch({ type: "SELECT_PRODUCT", id, advance: true }); }} />
      </Sheet>
    </div>
  );
}

function CompareTable({ ids, prioId, onPick }: { ids: string[]; prioId: string | null; onPick: (id: string) => void }) {
  const products = ids.map((id) => PRODUCTS.find((p) => p.id === id)!).filter(Boolean);
  const specLabels = [...new Set(products.flatMap((p) => p.specs.map((s) => s.label)))];
  return (
    <div className="nice-scroll mt-4 overflow-x-auto">
      <table className="w-full min-w-[520px] border-separate border-spacing-0 text-right">
        <thead>
          <tr>
            <th className="w-24 p-2 text-[10px] font-bold text-faint">مدل‌ها</th>
            {products.map((p) => (
              <th key={p.id} className="border-b border-line p-2">
                <span className={cn("mb-1 inline-block rounded-full px-2 py-0.5 text-[9px] font-extrabold", TIER_META[p.tier].cls)}>
                  {TIER_META[p.tier].label}
                </span>
                <span className="block text-[12px] font-extrabold leading-snug">{p.shortName}</span>
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          <tr>
            <td className="border-b border-line/60 p-2 text-[11px] font-bold text-sub">قیمت از</td>
            {products.map((p) => {
              const min = minPriceOffer(p.id);
              return (
                <td key={p.id} className="border-b border-line/60 p-2 text-[12px] font-black tnum">
                  {min ? faPrice(min.priceToman) : "—"}
                </td>
              );
            })}
          </tr>
          {specLabels.map((label) => (
            <tr key={label}>
              <td className="border-b border-line/60 p-2 text-[11px] font-bold text-sub">{label}</td>
              {products.map((p) => (
                <td key={p.id} className="border-b border-line/60 p-2 text-[11px] font-medium leading-relaxed">
                  {p.specs.find((s) => s.label === label)?.value ?? "—"}
                </td>
              ))}
            </tr>
          ))}
          <tr>
            <td className="border-b border-line/60 p-2 text-[11px] font-bold text-sub">تناسب با اولویت تو</td>
            {products.map((p) => (
              <td key={p.id} className="border-b border-line/60 p-2 text-[11px] font-bold">
                {prioId ? (
                  p.keywords.includes(prioId) ? (
                    <span className="text-mint">هم‌خوان</span>
                  ) : (
                    <span className="text-ambery">مصالحه</span>
                  )
                ) : (
                  <span className="text-faint">اولویتی ثبت نشده</span>
                )}
              </td>
            ))}
          </tr>
          <tr>
            <td className="p-2 text-[11px] font-bold text-sub">مصالحه‌ی اصلی</td>
            {products.map((p) => (
              <td key={p.id} className="p-2 align-top text-[10px] leading-relaxed text-sub">
                {p.tradeoffs[0]}
              </td>
            ))}
          </tr>
          <tr>
            <td />
            {products.map((p) => (
              <td key={p.id} className="p-2">
                <Btn size="sm" className="w-full" onClick={() => onPick(p.id)}>
                  انتخاب
                </Btn>
              </td>
            ))}
          </tr>
        </tbody>
      </table>
    </div>
  );
}
