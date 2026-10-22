import {
  CircleCheck,
  MapPinned,
  ShieldCheck,
  Store,
  TrendingDown,
  TriangleAlert,
  Undo2,
  X,
} from "lucide-react";
import { useMemo } from "react";
import { cn } from "../utils/cn";
import { getProduct, getStore } from "../data/demo";
import { faNum, faPrice } from "../lib/fa";
import {
  diagnoseNoAlternative,
  FAIL_COPY,
  planBRank,
  PRIORITY_META,
  rowsForProduct,
  type PlanBRow,
} from "../lib/ranking";
import { reqBudget, reqPriority, useSession } from "../state/session";
import type { RecoveryPriority } from "../lib/types";
import { TorobGardMascot } from "../components/Mascot";
import { Btn, DemoTag, StockBadge } from "../components/ui";

const PRIORITY_ICONS: Record<RecoveryPriority, typeof TrendingDown> = {
  price: TrendingDown,
  distance: MapPinned,
  trust: ShieldCheck,
};

export function PlanB() {
  const { state, dispatch } = useSession();
  const { planB, failures, req, previousPlan } = state;

  const product = getProduct(state.selectedProductId);
  const failedStore = getStore(previousPlan?.storeId ?? null);
  const failedIds = failures.map((f) => f.storeId);
  const budget = reqBudget(req);
  const prio = reqPriority(req);

  const ranked: PlanBRow[] = useMemo(() => {
    if (!product || !planB.priority) return [];
    return planBRank(product.id, failedIds, planB.priority, req);
  }, [product, planB.priority, failedIds.join(","), req]);

  if (!planB.open || !planB.reason || !product) return null;

  const fail = FAIL_COPY[planB.reason];
  const noAlt = planB.priority && ranked.length === 0;
  const totalCandidates = rowsForProduct(product.id).length;
  const diagnosis = noAlt ? diagnoseNoAlternative(totalCandidates) : null;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto nice-scroll bg-cream" role="dialog" aria-modal="true" aria-label="پلن B هوشمند">
      <div className="mx-auto max-w-4xl px-3 pb-24 pt-6 sm:px-6">
        <button
          onClick={() => dispatch({ type: "PLANB_CLOSE" })}
          aria-label="بستن پلن B"
          className="focusable fixed left-4 top-4 z-10 grid h-10 w-10 place-items-center rounded-full border border-line bg-white text-sub shadow-card transition hover:text-ink"
        >
          <X className="h-5 w-5" />
        </button>

        {/* hero */}
        <div className="anim-rise flex items-start gap-4">
          <TorobGardMascot
            pose="point"
            float
            className="h-28 w-24 shrink-0 sm:h-36 sm:w-32"
            alt="ترب‌گرد با قطب‌نما، مسیر تازه‌ای را نشان می‌دهد"
          />
          <div className="pt-2 sm:pt-5">
            <div className="flex flex-wrap items-center gap-2">
              <span className="rounded-full bg-ink px-2.5 py-1 text-[10px] font-extrabold text-white">پلن B هوشمند</span>
              <DemoTag />
            </div>
            <h2 className="mt-2 text-xl font-black leading-relaxed sm:text-2xl">
              این یکی نشد؟ بیا یه راه بهتر پیدا کنیم!
            </h2>
            <p className="mt-1 max-w-lg text-[12px] font-medium leading-relaxed text-sub">
              سفر خریدت نمی‌شکنه. نیازها و انتخاب‌هات دست‌نخورده می‌مونه؛ فقط مسیر رو عوض می‌کنیم.
            </p>
          </div>
        </div>

        {/* what went wrong */}
        <div className="anim-rise mt-5 flex items-start gap-3 rounded-3xl border border-ambery/25 bg-amber-tint p-4" style={{ animationDelay: "60ms" }}>
          <TriangleAlert className="mt-0.5 h-5 w-5 shrink-0 text-ambery" />
          <div>
            <p className="text-sm font-extrabold text-ambery">
              {fail.title}
              {failedStore && <span className="font-bold"> — {failedStore.name}</span>}
            </p>
            <p className="mt-1 text-[11px] font-medium leading-relaxed text-ambery/90">{fail.body}</p>
          </div>
        </div>

        {/* preserved requirements */}
        <div className="anim-rise mt-4 rounded-3xl border border-line bg-white p-4 shadow-card" style={{ animationDelay: "120ms" }}>
          <p className="text-[11px] font-extrabold text-sub">چیزی که حفظ می‌شه (محافظت‌شده):</p>
          <div className="mt-2 flex flex-wrap gap-1.5">
            <span className="rounded-full bg-ink px-2.5 py-1 text-[10px] font-bold text-white">مدل: {product.shortName}</span>
            <span className="rounded-full bg-cream px-2.5 py-1 text-[10px] font-bold text-ink ring-1 ring-line">
              هدف: {req.goalText || "—"}
            </span>
            <span className="rounded-full bg-cream px-2.5 py-1 text-[10px] font-bold text-ink ring-1 ring-line">
              بودجه: {budget ? budget.label : "مشخص نشده"}
            </span>
            <span className="rounded-full bg-cream px-2.5 py-1 text-[10px] font-bold text-ink ring-1 ring-line">
              اولویت: {prio ? prio.label : "مشخص نشده"}
            </span>
            {failedIds.length > 0 && (
              <span className="rounded-full bg-brand-tint px-2.5 py-1 text-[10px] font-bold text-brand-deep">
                {faNum(failedIds.length)} فروشگاهِ ردشده از چرخه خارج شد
              </span>
            )}
          </div>
        </div>

        {/* recovery priorities */}
        <p className="anim-rise mt-6 text-sm font-extrabold" style={{ animationDelay: "180ms" }}>
          حالا بگو چی برات مهم‌تره:
        </p>
        <div className="anim-rise mt-3 grid gap-2.5 sm:grid-cols-3" style={{ animationDelay: "220ms" }}>
          {(Object.keys(PRIORITY_META) as RecoveryPriority[]).map((p) => {
            const Icon = PRIORITY_ICONS[p];
            const active = planB.priority === p;
            return (
              <button
                key={p}
                type="button"
                onClick={() => dispatch({ type: "PLANB_PRIORITY", priority: p })}
                className={cn(
                  "focusable flex items-center gap-3 rounded-3xl border p-4 text-right transition active:scale-[0.98]",
                  active
                    ? "border-brand bg-brand text-white shadow-[0_10px_26px_-10px_rgb(217_45_43/0.6)]"
                    : "border-line bg-white hover:border-brand/40 hover:shadow-card"
                )}
              >
                <span className={cn("grid h-10 w-10 shrink-0 place-items-center rounded-2xl", active ? "bg-white/20" : "bg-brand-tint text-brand-deep")}>
                  <Icon className="h-5 w-5" />
                </span>
                <span>
                  <span className="block text-[13px] font-extrabold">{PRIORITY_META[p].label}</span>
                  <span className={cn("block text-[10px] font-medium", active ? "text-white/80" : "text-sub")}>
                    {PRIORITY_META[p].sub}
                  </span>
                </span>
              </button>
            );
          })}
        </div>

        {/* explanation + re-ranked results */}
        {planB.priority && (
          <div key={planB.priority} className="anim-rise mt-5">
            <div className="flex items-start gap-2 rounded-2xl bg-cloud p-3.5 text-[11px] font-semibold leading-relaxed text-sky-ink">
              <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0" />
              {PRIORITY_META[planB.priority].why}
            </div>

            {diagnosis && (
              <div className="anim-rise mt-4 rounded-3xl border border-dashed border-line bg-white/70 p-5 text-center">
                <TorobGardMascot pose="stuck" framed={false} className="mx-auto h-28 w-28" />
                <h3 className="text-sm font-extrabold">{diagnosis.title}</h3>
                <p className="mx-auto mt-1 max-w-md text-[11px] leading-relaxed text-sub">{diagnosis.body}</p>
                <p className="mx-auto mt-3 max-w-md rounded-2xl bg-brand-tint p-3 text-[11px] font-bold leading-relaxed text-brand-deep">
                  محدودیت فعلی: {diagnosis.suggestion}
                </p>
                <div className="mt-3 flex flex-wrap justify-center gap-2">
                  <Btn size="sm" onClick={() => { dispatch({ type: "PLANB_CLOSE" }); dispatch({ type: "GO", stage: "products" }); }}>
                  رفتن به میز تصمیم
                  </Btn>
                  <Btn size="sm" variant="outline" onClick={() => dispatch({ type: "SET_FILTERS", patch: { maxDistanceKm: null, maxPrice: null } })}>
                    باز کردن سقف فاصله و قیمت
                  </Btn>
                </div>
              </div>
            )}

            <div className="mt-4 flex flex-col gap-3">
              {ranked.map((r, i) => {
                const { offer, store } = r.row;
                return (
                  <article
                    key={store.id}
                    className={cn(
                      "anim-rise rounded-3xl border bg-white p-4 shadow-card",
                      i === 0 ? "border-brand ring-2 ring-brand/25" : "border-line"
                    )}
                    style={{ animationDelay: `${i * 70}ms` }}
                  >
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div className="flex items-center gap-2.5">
                        <span className={cn("grid h-8 w-8 place-items-center rounded-full text-[12px] font-black", i === 0 ? "bg-brand text-white" : "bg-cream ring-1 ring-line")}>
                          {faNum(r.rank)}
                        </span>
                        <div>
                          <p className="text-[13px] font-extrabold">{store.name}</p>
                          <p className="text-[10px] font-semibold text-sub">{store.neighborhood} · فاصله: {faNum(store.distanceKm % 1 === 0 ? store.distanceKm : store.distanceKm.toFixed(1).replace(".", "٫"))} کیلومتر</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        {i === 0 && <span className="rounded-full bg-brand-tint px-2 py-1 text-[9px] font-extrabold text-brand-deep">بهترین برای این اولویت</span>}
                        <p className="text-[16px] font-black tnum">{faPrice(offer.priceToman)}</p>
                      </div>
                    </div>

                    <div className="mt-3 grid gap-2.5 md:grid-cols-3">
                      <div className="rounded-2xl bg-mint-tint/60 p-3">
                        <p className="mb-1.5 text-[10px] font-extrabold text-mint">چرا این رتبه؟</p>
                        {r.reasons.map((t) => (
                          <p key={t} className="flex items-start gap-1.5 text-[11px] font-medium leading-relaxed text-ink">
                            <CircleCheck className="mt-0.5 h-3.5 w-3.5 shrink-0 text-mint" /> {t}
                          </p>
                        ))}
                      </div>
                      <div className="rounded-2xl bg-amber-tint/60 p-3">
                        <p className="mb-1.5 text-[10px] font-extrabold text-ambery">مصالحه (صادقانه)</p>
                        {r.tradeoffs.length === 0 && (
                          <p className="text-[11px] font-medium leading-relaxed text-sub">مصالحه‌ی مهم نسبت به گزینه‌ی قبلی نداره.</p>
                        )}
                        {r.tradeoffs.map((t) => (
                          <p key={t} className="flex items-start gap-1.5 text-[11px] font-medium leading-relaxed text-ink">
                            <TriangleAlert className="mt-0.5 h-3.5 w-3.5 shrink-0 text-ambery" /> {t}
                          </p>
                        ))}
                      </div>
                      <div className="rounded-2xl bg-cream p-3">
                        <p className="mb-1.5 text-[10px] font-extrabold text-sub">نیازهای دست‌نخورده</p>
                        {r.kept.map((t) => (
                          <p key={t} className="flex items-start gap-1.5 text-[11px] font-medium leading-relaxed text-ink">
                            <ShieldCheck className="mt-0.5 h-3.5 w-3.5 shrink-0 text-sky-ink" /> {t}
                          </p>
                        ))}
                        <div className="mt-2"><StockBadge stock={offer.stock} compact /></div>
                      </div>
                    </div>

                    <div className="mt-3 flex flex-wrap gap-2">
                      <Btn className="flex-1 sm:flex-none" icon={Store} onClick={() => dispatch({ type: "PLANB_ACCEPT", storeId: store.id })}>
                        باز کردن فروشگاه جایگزین
                      </Btn>
                      {i > 0 && <span className="self-center text-[10px] font-semibold text-faint">گزینه‌ی {faNum(r.rank)} برای اولویت «{PRIORITY_META[planB.priority!].label}»</span>}
                    </div>
                  </article>
                );
              })}
            </div>
          </div>
        )}

        {/* footer */}
        <div className="anim-rise mt-6 flex flex-wrap items-center gap-2 rounded-3xl border border-line bg-white p-3.5 shadow-card" style={{ animationDelay: "260ms" }}>
          <Btn variant="outline" icon={Undo2} onClick={() => dispatch({ type: "PLANB_RETURN" })}>
            برگرد به پلن قبلی
          </Btn>
          <p className="w-full text-[10px] font-medium leading-relaxed text-sub sm:w-auto sm:flex-1">
            با برگشت به پلن قبلی، جلسه‌ی خریدت (نیازها، مدل، فیلترها و سابقه‌ی تصمیم‌ها) دست‌نخورده باقی می‌مونه؛ فروشگاه ردشده در تاریخچه علامت می‌مونه.
          </p>
        </div>
      </div>
    </div>
  );
}
