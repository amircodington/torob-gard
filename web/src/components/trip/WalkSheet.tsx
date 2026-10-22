"use client";

import gsap from "gsap";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { Suspense, useLayoutEffect, useRef, useState, type PointerEvent, type ReactNode } from "react";
import { api, type ReportInput } from "../../lib/api";
import { faFreshness, faGroup, faNum, isStale } from "../../lib/fa";
import type { FailReason, OfferRow, Trip } from "../../lib/types";
import { useSession } from "../../state/session";
import { PlanB } from "../planb/PlanB";

const REDUCED = "(prefers-reduced-motion: reduce)";
const PEEK = 0.45; // of the viewport: the 85% sheet slides down to show ~40%

export const floorName = (f: number) => (f === 0 ? "همکف" : f < 0 ? `منفی ${faNum(-f)}` : faNum(f));

/** The shop's floor and its neighbours (±2, basements down to −2); null → no segments. */
function floorsAround(floor: string | null): number[] | null {
  const f = floor == null ? NaN : Number(floor);
  if (!Number.isInteger(f)) return null;
  const out: number[] = [];
  for (let i = Math.max(f - 2, -2); i <= f + 2; i++) out.push(i);
  return out;
}

function StatCard({ tone, icon, children }: { tone: string; icon: ReactNode; children: ReactNode }) {
  return (
    <div className={`flex min-h-21 items-center gap-3 rounded-md p-4 ${tone}`}>
      <span aria-hidden className="grid h-12 w-12 shrink-0 place-items-center rounded-full bg-white/12">
        <svg viewBox="0 0 24 24" className="h-6 w-6" fill="none" stroke="currentColor" strokeWidth={1.75} strokeLinecap="round" strokeLinejoin="round">
          {icon}
        </svg>
      </span>
      <div className="min-w-0">{children}</div>
    </div>
  );
}

export function WalkSheet({ trip, rows, rowsFailed = false }: { trip: Trip; rows: OfferRow[]; rowsFailed?: boolean }) {
  const { dispatch } = useSession();
  const router = useRouter();
  const pathname = usePathname();
  const sheet = useRef<HTMLElement>(null);
  const drag = useRef<{ y0: number; base: number; moved: boolean } | null>(null);
  const dragged = useRef(false);
  const [full, setFull] = useState(true);
  const [step, setStep] = useState<"idle" | "asked" | "had">("idle");
  const [busy, setBusy] = useState(false);

  // Motion moment: the sheet rises over the paper (power3.out); reduced motion → it is simply there.
  useLayoutEffect(() => {
    const mm = gsap.matchMedia();
    mm.add("(prefers-reduced-motion: no-preference)", () => {
      gsap.from(sheet.current, { yPercent: 100, duration: 0.4, ease: "power3.out" });
    });
    return () => mm.revert();
  }, []);

  const shop = trip.shop;
  if (!shop)
    return (
      <main className="mx-auto max-w-md px-4 pt-6">
        <Link href={`/trip/${trip.id}`} className="inline-flex min-h-11 items-center font-bold underline underline-offset-4">برگشت به چک‌لیست</Link>
      </main>
    );

  const offer = rows.find((r) => r.store.id === shop.id)?.offer;
  const maybe = shop.parseConfidence < 0.8 ? "احتمالاً " : "";
  const floors = floorsAround(shop.floor);

  // Sheet gesture: follows the finger, rubber-bands past the ends, snaps to peek or full; grabbing interrupts a snap.
  // ponytail: two snap points, no velocity-based fling; a resize while peeking keeps the old offset.
  const peekY = () => window.innerHeight * PEEK;
  const snapTo = (toFull: boolean) => {
    setFull(toFull);
    const y = toFull ? 0 : peekY();
    if (window.matchMedia(REDUCED).matches) gsap.set(sheet.current, { y });
    else gsap.to(sheet.current, { y, duration: 0.35, ease: "power3.out", overwrite: "auto" });
  };
  const down = (e: PointerEvent<HTMLButtonElement>) => {
    gsap.killTweensOf(sheet.current, "y");
    drag.current = { y0: e.clientY, base: Number(gsap.getProperty(sheet.current, "y")), moved: false };
    e.currentTarget.setPointerCapture(e.pointerId);
  };
  const move = (e: PointerEvent) => {
    const d = drag.current;
    if (!d) return;
    const y = d.base + e.clientY - d.y0;
    if (Math.abs(e.clientY - d.y0) > 6) d.moved = true;
    const max = peekY();
    gsap.set(sheet.current, { y: y < 0 ? y / 4 : y > max ? max + (y - max) / 4 : y });
  };
  const up = () => {
    const d = drag.current;
    drag.current = null;
    if (!d?.moved) return; // a tap: the click handler toggles
    dragged.current = true;
    snapTo(Number(gsap.getProperty(sheet.current, "y")) < peekY() / 2);
  };

  const report = (kind: ReportInput["kind"]) => api.report({ shopId: shop.id, productId: trip.productId, kind }).catch(() => {});
  const toPlanB = async (reason: FailReason, kind: ReportInput["kind"]) => {
    setBusy(true);
    // ponytail: the report is a signal for others; Plan B opens even when it does not reach the server.
    await report(kind);
    // A shared link has no session: adopt the trip so Plan B knows the failed shop and patches this trip.
    dispatch({ type: "TRIP_CREATED", id: trip.id, failures: trip.failures });
    dispatch({ type: "CHOOSE_STORE", id: shop.id });
    dispatch({ type: "FAIL_STORE", reason });
    setBusy(false);
    router.push(`${pathname}?planb=${reason}`);
  };

  return (
    <main className="min-h-dvh">
      <div className="mx-auto flex max-w-md items-center gap-3 px-4">
        <p className="min-w-0 flex-1 truncate text-[13px] text-ink-muted">{trip.product.title}</p>
        <Link href={`/trip/${trip.id}`} className="inline-flex min-h-11 shrink-0 items-center text-[13px] font-bold underline underline-offset-4">
          برگشت به چک‌لیست
        </Link>
      </div>

      <section
        ref={sheet}
        aria-label="مسیر تا فروشگاه"
        className="fixed inset-x-0 bottom-0 z-30 mx-auto flex h-[85dvh] max-w-md flex-col rounded-t-sheet bg-panel text-on-dark shadow-sheet"
      >
        <button
          type="button"
          aria-expanded={full}
          aria-label={full ? "کوچک‌تر" : "بزرگ‌تر"}
          onPointerDown={down}
          onPointerMove={move}
          onPointerUp={up}
          onPointerCancel={up}
          onClick={() => (dragged.current ? (dragged.current = false) : snapTo(!full))}
          className="grid h-11 w-full shrink-0 touch-none cursor-grab place-items-center rounded-t-sheet focus-visible:outline-2 focus-visible:outline-focus"
        >
          <span aria-hidden className="h-1.5 w-12 rounded-pill bg-white/30" />
        </button>

        <div className="grid content-start gap-4 overflow-y-auto overscroll-contain px-5 pb-[max(28px,env(safe-area-inset-bottom))]">
          <div>
            <h1 className="break-words text-[20px] font-extrabold leading-8">{shop.mall ? faNum(shop.mall) : "پاساژ ثبت نشده"}</h1>
            <p className="break-words text-[13px] leading-5 text-on-dark/70">{shop.name}</p>
          </div>

          {floors ? (
            <ul aria-label="طبقه‌ها" className="flex gap-2">
              {floors.map((f) => {
                const here = String(f) === shop.floor;
                return (
                  <li
                    key={f}
                    aria-current={here ? "location" : undefined}
                    className={`grid min-h-11 flex-1 place-items-center rounded-pill px-1 text-[14px] font-semibold ${here ? "bg-orange text-on-orange" : "bg-panel-2"}`}
                  >
                    {floorName(f)}
                  </li>
                );
              })}
            </ul>
          ) : (
            <p className="grid min-h-11 place-items-center rounded-pill bg-panel-2 text-[14px] font-semibold">
              {shop.floor == null ? "طبقه ثبت نشده" : `طبقه ${faNum(shop.floor)}`}
            </p>
          )}

          <div data-testid="unit">
            {shop.unit != null ? (
              <p className="tabular text-[30px] font-bold leading-tight">
                {maybe && <span className="text-[15px] font-semibold text-on-dark/75">{maybe}</span>}
                واحد {faNum(shop.unit)}
              </p>
            ) : (
              <p className="text-[15px] leading-6">شماره‌ی واحد ثبت نشده — {shop.mall ? "از اطلاعات پاساژ بپرس" : "قبل از رفتن زنگ بزن"}</p>
            )}
          </div>
          {shop.locationHint && <p className="-mt-2 break-words text-[13px] leading-5 text-on-dark/75">{faNum(shop.locationHint)}</p>}

          <div className="grid gap-3 sm:grid-cols-2">
            <StatCard tone="bg-panel-brown" icon={<><rect x="3" y="6" width="18" height="12" rx="2" /><circle cx="12" cy="12" r="2.5" /></>}>
              {offer ? (
                <>
                  <p className="tabular text-[22px] font-bold leading-8">{faGroup(offer.priceToman)}</p>
                  <p className="text-[12px] text-on-dark/80">تومان · قیمت ثبت‌شده در ترب</p>
                </>
              ) : (
                <p className="text-[13px]">{rowsFailed ? "قیمت الان در دسترس نیست" : "قیمتی از این فروشگاه پیدا نشد"}</p>
              )}
            </StatCard>
            <StatCard tone="bg-panel-plum" icon={<><circle cx="12" cy="12" r="9" /><path d="M12 7v5l3 2" /></>}>
              {offer ? (
                <>
                  <p className="text-[17px] font-bold leading-7">به‌روزرسانی {faFreshness(offer.updatedMinAgo)}</p>
                  <p className="text-[12px] text-on-dark/80">
                    {isStale(offer.updatedMinAgo) ? "ممکن است تغییر کرده باشد · " : ""}تأییدنشده
                  </p>
                </>
              ) : (
                <p className="text-[13px]">تأییدنشده</p>
              )}
            </StatCard>
          </div>

          {step === "idle" && (
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                disabled={busy}
                onClick={() => {
                  report("open");
                  setStep("asked");
                }}
                className="min-h-11 rounded-pill bg-orange px-4 text-[15px] font-bold text-on-orange focus-visible:outline-2 focus-visible:outline-focus active:scale-[0.97] disabled:opacity-50"
              >
                پیداش کردم
              </button>
              <button
                type="button"
                disabled={busy}
                onClick={() => toPlanB("closed", "closed")}
                className="min-h-11 rounded-pill bg-panel-2 px-4 text-[15px] font-bold focus-visible:outline-2 focus-visible:outline-focus active:scale-[0.97] disabled:opacity-50"
              >
                اینجا نیست
              </button>
            </div>
          )}
          {step === "asked" && (
            <div>
              <p className="text-[15px] font-bold">داشت؟</p>
              <div className="mt-2 grid grid-cols-2 gap-2">
                <button
                  type="button"
                  disabled={busy}
                  onClick={() => {
                    report("had_item");
                    setStep("had");
                  }}
                  className="min-h-11 rounded-pill bg-orange px-4 text-[15px] font-bold text-on-orange focus-visible:outline-2 focus-visible:outline-focus active:scale-[0.97] disabled:opacity-50"
                >
                  آره
                </button>
                <button
                  type="button"
                  disabled={busy}
                  onClick={() => toPlanB("stock", "no_item")}
                  className="min-h-11 rounded-pill bg-panel-2 px-4 text-[15px] font-bold focus-visible:outline-2 focus-visible:outline-focus active:scale-[0.97] disabled:opacity-50"
                >
                  نه
                </button>
              </div>
            </div>
          )}
          {step === "had" && (
            <p role="status" className="text-[17px] font-extrabold">
              خرید خوب! 🎉
            </p>
          )}
          <p className="text-[12px] leading-5 text-on-dark/70">ترب‌گرد — پروژه‌ی چالش ترب/استارکوچ؛ محصول رسمی ترب نیست.</p>
        </div>
      </section>

      <Suspense fallback={null}>
        <PlanB rows={rows} onAccepted={() => router.replace(`/trip/${trip.id}`)} />
      </Suspense>
    </main>
  );
}
