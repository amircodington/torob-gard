"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { gsap } from "gsap";
import { Flip } from "gsap/Flip";
import { api } from "../../lib/api";
import { DUR, registerMotion, reduced } from "../../lib/motion";
import { faNum, faPriceFull } from "../../lib/fa";
import { diagnoseNoAlternative, FAIL_COPY, planBRank, PRIORITY_META } from "../../lib/ranking";
import type { FailReason, OfferRow, RecoveryPriority } from "../../lib/types";
import { reqBudget, reqPriority, useSession } from "../../state/session";
import { Mascot } from "../Mascot";
import { distanceLabel, placeLine } from "../radar/ShopRow";
import { Btn } from "../ui/Btn";
import { FreshBadge } from "../ui/FreshBadge";
import { StockBadge } from "../ui/StockBadge";
import { ArrowLeft, Banknote, Check, Footprints, Lock, Minus, ShieldCheck, X, type LucideIcon } from "lucide-react";

const PRIORITY_ICON: Record<RecoveryPriority, LucideIcon> = { price: Banknote, distance: Footprints, trust: ShieldCheck };

const isReason = (r: string | null): r is FailReason => r != null && r in FAIL_COPY;

/** Open when the URL says `?planb=<reason>` or the state does; a Back that drops the param closes it. */
function usePlanBParam() {
  const { state, dispatch } = useSession();
  const router = useRouter();
  const pathname = usePathname();
  const raw = useSearchParams().get("planb");
  const param = isReason(raw) ? raw : null;
  const seen = useRef(false);
  useEffect(() => {
    if (param) seen.current = true;
    else if (seen.current) {
      seen.current = false;
      if (state.planB.open) dispatch({ type: "PLANB_CLOSE" });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- react to the URL only
  }, [param]);
  return {
    open: state.planB.open || param != null,
    reason: state.planB.reason ?? param,
    leave: () => router.replace(pathname),
  };
}

function Chip({ children }: { children: React.ReactNode }) {
  return <span className="rounded-pill bg-surface-tint px-3 py-1 text-[13px] font-semibold leading-5">{children}</span>;
}

function Points({ title, items, empty, icon: Icon, tone = "text-ink-muted" }: { title: string; items: string[]; empty?: string; icon: LucideIcon; tone?: string }) {
  if (items.length === 0 && !empty) return null;
  return (
    <div className="mt-3">
      <p className="text-[12px] font-bold text-ink-muted">{title}</p>
      {/* <p>s, not a nested list: the cards are the only list items */}
      <div className="mt-1 grid gap-0.5 text-[13px] leading-5">
        {items.length === 0 ? <p className="text-ink-muted">{empty}</p> : items.map((t) => (
              <p key={t} className="flex items-start gap-1.5">
                <Icon aria-hidden className={`mt-0.5 size-4 shrink-0 ${tone}`} />
                {t}
              </p>
            ))}
      </div>
    </div>
  );
}

/** `onAccepted` replaces the default «drop ?planb» once a pick is saved (walk mode goes back to its checklist). */
export function PlanB({ rows, onAccepted }: { rows: OfferRow[] | undefined; onAccepted?: () => void }) {
  const { state, dispatch } = useSession();
  const { open, reason, leave } = usePlanBParam();
  const close = useRef<HTMLButtonElement>(null);
  const [saveFailed, setSaveFailed] = useState(false);
  const { planB, failures, req, previousPlan } = state;
  const failedIds = failures.map((f) => f.storeId);
  const failedKey = failedIds.join(",");
  const budget = reqBudget(req);
  const prio = reqPriority(req);
  const visible = open && reason != null && rows != null;
  const list = useRef<HTMLUListElement>(null);
  const flip = useRef<Flip.FlipState | null>(null);

  // Re-rank moment: rows move to their new places (320 ms tg.inOut), new rows fade in; reduced motion → they just swap.
  // keyboard: Enter/Space fire a click with detail 0 — no animation on a keyboard action, rows just swap.
  const choose = (priority: RecoveryPriority, keyboard: boolean) => {
    if (priority === planB.priority) return;
    registerMotion();
    const rowsNow = list.current?.querySelectorAll("li");
    flip.current = rowsNow?.length && !reduced() && !keyboard ? Flip.getState(rowsNow) : null;
    dispatch({ type: "PLANB_PRIORITY", priority });
  };
  useLayoutEffect(() => {
    const state = flip.current;
    flip.current = null;
    if (!state || !list.current) return;
    Flip.from(state, {
      targets: list.current.querySelectorAll("li"),
      duration: DUR.sheet,
      ease: "tg.inOut",
      absolute: false,
      onEnter: (els) => gsap.fromTo(els, { opacity: 0 }, { opacity: 1, duration: DUR.base }),
    });
  }, [planB.priority]);

  const ranked = useMemo(
    () => (rows && planB.priority ? planBRank(rows, failedIds, planB.priority, budget) : []),
    // eslint-disable-next-line react-hooks/exhaustive-deps -- failedKey stands for failedIds
    [rows, failedKey, planB.priority, budget],
  );

  const accept = async (storeId: string) => {
    setSaveFailed(false);
    // The saved trip follows the pick. PATCH appends failures, so only the newest one goes; the rest are saved already.
    // A failed save stays here with an error: leaving would show a trip page that still names the old shop.
    if (state.tripId) {
      try {
        await api.patchTrip(state.tripId, { chosenShopId: storeId, failures: failures.slice(-1) });
      } catch {
        setSaveFailed(true);
        return;
      }
    }
    dispatch({ type: "PLANB_ACCEPT", storeId });
    (onAccepted ?? leave)();
  };

  const shut = () => {
    dispatch({ type: "PLANB_CLOSE" });
    leave();
  };

  useEffect(() => {
    if (!visible) return;
    close.current?.focus();
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== "Escape") return;
      dispatch({ type: "PLANB_CLOSE" });
      leave();
    };
    window.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- bind once per opening
  }, [visible]);

  if (!visible) return null;
  const fail = FAIL_COPY[reason];
  const failedStore = rows.find((r) => r.store.id === previousPlan?.storeId)?.store;
  const left = rows.filter((r) => !failedIds.includes(r.store.id)).length;
  const diagnosis = left === 0 ? diagnoseNoAlternative(rows.length) : null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="پلن B"
      // fill backwards, not both: a lasting transform would outlive the entrance for nothing
      className="fixed inset-0 z-50 animate-[rise_280ms_var(--ease-out)_backwards] overflow-y-auto overscroll-contain bg-paper [--rise:24px] motion-reduce:[--rise:0px]"
    >
      <div className="page pb-[max(32px,env(safe-area-inset-bottom))] pt-4">
        <div className="flex justify-end">
          <button
            ref={close}
            type="button"
            onClick={shut}
            aria-label="بستن پلن B"
            className="grid h-11 w-11 place-items-center rounded-full bg-surface shadow-card focus-visible:outline-2 focus-visible:outline-focus"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="lg:grid lg:grid-cols-[360px_minmax(0,1fr)] lg:items-start lg:gap-8">
          <div className="lg:sticky lg:top-4">
            <div className="flex items-start gap-3">
              <Mascot pose="point" react="hop" className="size-28" alt="ترب‌گرد با قطب‌نما، مسیر تازه‌ای را نشان می‌دهد" />
              <div className="min-w-0 pt-2">
                <span className="rounded-pill bg-panel px-3 py-1 text-[12px] font-bold text-on-dark">پلن B</span>
                <h2 className="mt-2 text-[20px] leading-8">
                  <span className="font-light">این یکی نشد؟ </span>
                  <span className="font-extrabold">بیا یه راه دیگه پیدا کنیم</span>
                </h2>
                <p className="mt-1 text-[13px] leading-5 text-ink-muted">سفر خریدت نمی‌شکنه؛ نیازها و مدلت دست‌نخورده می‌مونه، فقط مسیر عوض می‌شه.</p>
              </div>
            </div>

            <section className="mt-4 rounded-lg bg-surface p-5 shadow-card">
              <p className="text-[12px] font-bold text-ink-muted">چی شد؟</p>
              <p className="mt-1 break-words text-[15px] font-bold leading-6">
                <span className="text-signal">{fail.title}</span>
                {failedStore && <span> — {failedStore.name}</span>}
              </p>
              <p className="mt-1 text-[13px] leading-5 text-ink-muted">{fail.body}</p>
            </section>

            <section className="mt-3 rounded-lg bg-surface p-5 shadow-card">
              <p className="text-[12px] font-bold text-ink-muted">چی رو نگه می‌داریم</p>
              <div className="mt-2 flex flex-wrap gap-1.5">
                <Chip>هدف: {req.goalText || "مشخص نشده"}</Chip>
                <Chip>بودجه: {budget ? budget.label : "مشخص نشده"}</Chip>
                <Chip>اولویت: {prio ? prio.label : "مشخص نشده"}</Chip>
                {failedIds.length > 0 && <Chip>{faNum(failedIds.length)} فروشگاهِ ردشده از چرخه خارج شد</Chip>}
              </div>
            </section>
          </div>

          <div className="min-w-0">
            {diagnosis ? (
              <section className="mt-4 rounded-lg bg-surface p-5 text-center shadow-card lg:mt-0">
                <h3 className="text-[17px] font-extrabold leading-7">{diagnosis.title}</h3>
                <p className="mt-1 text-[13px] leading-5 text-ink-muted">{diagnosis.body}</p>
                <p className="mt-3 rounded-md bg-surface-tint p-3 text-[13px] font-semibold leading-5">محدودیت فعلی: {diagnosis.suggestion}</p>
                <Btn
                  className="mt-4"
                  onClick={() => {
                    // ponytail: the ?planb entry stays in history; Back from the desk reopens this card, which is still true.
                    dispatch({ type: "PLANB_CLOSE" });
                    dispatch({ type: "GO", stage: "products" });
                  }}
                >
                  برگشت به میز تصمیم
                </Btn>
              </section>
            ) : (
              <>
                <p className="mt-6 text-[15px] font-extrabold lg:mt-0">حالا بگو چی برات مهم‌تره:</p>
                <div className="mt-2 grid gap-2 md:grid-cols-3">
                  {(Object.keys(PRIORITY_META) as RecoveryPriority[]).map((p) => {
                    const active = planB.priority === p;
                    const Icon = PRIORITY_ICON[p];
                    return (
                      <button
                        key={p}
                        type="button"
                        aria-pressed={active}
                        onClick={(e) => choose(p, e.detail === 0)}
                        className={`flex min-h-11 items-start gap-3 rounded-lg p-4 text-start shadow-card transition-[background-color,color,scale] duration-(--duration-fast) ease-out focus-visible:outline-2 focus-visible:outline-focus active:scale-[0.98] ${active ? "bg-orange text-on-orange" : "bg-surface"}`}
                      >
                        <Icon aria-hidden className={`mt-0.5 size-5 shrink-0 ${active ? "" : "text-orange"}`} />
                        <span className="min-w-0">
                          <span className="block text-[15px] font-bold">{PRIORITY_META[p].label}</span>
                          <span className={`block text-[13px] transition-colors duration-(--duration-fast) ${active ? "text-on-orange" : "text-ink-muted"}`}> {PRIORITY_META[p].sub}</span>
                        </span>
                      </button>
                    );
                  })}
                </div>

                {planB.priority && (
                  <>
                    <p className="mt-4 rounded-md bg-surface-tint p-3 text-[13px] leading-5">{PRIORITY_META[planB.priority].why}</p>
                    {saveFailed && (
                      <p role="alert" className="mt-3 rounded-md bg-surface p-3 text-[13px] font-bold leading-5 text-signal shadow-card">
                        انتخابت ذخیره نشد؛ به سرور ترب‌گرد نرسیدم. دوباره امتحان کن.
                      </p>
                    )}
                    <ul ref={list} aria-label="گزینه‌های جایگزین" className="mt-3 grid gap-3">
                      {ranked.map((r) => {
                        const { offer, store } = r.row;
                        return (
                          <li key={offer.offerId} className="rounded-lg bg-surface p-5 shadow-card">
                            <div className="flex items-start gap-3">
                              <span className={`grid h-8 w-8 shrink-0 place-items-center rounded-full text-[13px] font-extrabold ${r.rank === 1 ? "bg-orange text-on-orange" : "bg-surface-tint"}`}>
                                {faNum(r.rank)}
                              </span>
                              <div className="min-w-0 flex-1">
                                <h3 className="line-clamp-2 break-words text-[15px] font-bold leading-6">{store.name}</h3>
                                <p className="break-words text-[13px] leading-5 text-ink-muted">{placeLine(store)}</p>
                                <p className="text-[12px] leading-5 text-ink-muted">{distanceLabel(store.distanceM)}</p>
                              </div>
                            </div>
                            <div className="mt-2 flex flex-wrap items-center justify-between gap-2">
                              <div>
                                <p className="tabular whitespace-nowrap text-[17px] font-extrabold">{faPriceFull(offer.priceToman)}</p>
                                <FreshBadge updatedMinAgo={offer.updatedMinAgo} />
                              </div>
                              <StockBadge stock={offer.stock} />
                            </div>
                            <Points title="چرا این رتبه؟" items={r.reasons} icon={Check} tone="text-verified" />
                            <Points title="مصالحه (صادقانه)" items={r.tradeoffs} empty="مصالحه‌ی مهمی نسبت به گزینه‌ی قبلی نداره." icon={Minus} />
                            <Points title="نیازهای دست‌نخورده" items={r.kept} icon={Lock} />
                            <Btn className="mt-4 w-full" onClick={() => accept(store.id)}>
                              انتخاب این فروشگاه
                            </Btn>
                          </li>
                        );
                      })}
                    </ul>
                  </>
                )}
              </>
            )}

            <div className="mt-6 rounded-lg bg-surface p-5 shadow-card">
              <Btn variant="ghost" icon={ArrowLeft} className="w-full" onClick={() => { dispatch({ type: "PLANB_RETURN" }); leave(); }}>
                برگشت به برنامه‌ی قبلی
              </Btn>
              <p className="mt-2 text-[12px] leading-5 text-ink-muted">
                نیازها، مدل و فیلترهات دست‌نخورده می‌مونه؛ فروشگاه ردشده در تاریخچه علامت می‌مونه.
              </p>
            </div>
          </div>
        </div>
        <p className="mt-6 text-center text-[11px] font-semibold leading-5 text-ink-muted">ترب‌گرد — پروژه‌ی چالش ترب/استارکوچ؛ محصول رسمی ترب نیست.</p>
      </div>
    </div>
  );
}
