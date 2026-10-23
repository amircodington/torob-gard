"use client";

import { useEffect, useState } from "react";
import { CompareSheet } from "../../components/desk/CompareSheet";
import { ReqChips } from "../../components/desk/ReqChips";
import { TierCard } from "../../components/desk/TierCard";
import { deskEmpty, staleCompareIds } from "../../components/desk/compare";
import { JourneyShell } from "../../components/JourneyShell";
import { Mascot } from "../../components/Mascot";
import { Btn } from "../../components/ui/Btn";
import { TierSkeletons } from "../../components/ui/Skeleton";
import { EmptyState } from "../../components/ui/EmptyState";
import { api } from "../../lib/api";
import { BUDGETS } from "../../config/journey";
import { faNum } from "../../lib/fa";
import type { DeskTier } from "../../lib/types";
import { reqBudget, reqPriority, useSession } from "../../state/session";

type Result = { key: string; tiers?: DeskTier[]; now?: number; error?: true };

function Desk() {
  const { state, dispatch } = useSession();
  const { req } = state;
  const budget = reqBudget(req);
  const prio = reqPriority(req);
  const [attempt, setAttempt] = useState(0);
  const [res, setRes] = useState<Result | null>(null);
  const [compareOpen, setCompareOpen] = useState(false);

  // ponytail: the provider renders initialState() before it reads storage; stage turns "products" once hydrated.
  const ready = state.stage === "products";
  const askable = ready && req.category !== null && req.category !== "other";
  const key = JSON.stringify([req.category, budget?.min ?? 0, budget?.max ?? null, prio?.id ?? null, attempt]);

  useEffect(() => {
    if (!askable) return;
    let live = true;
    const input = { category: req.category!, budgetMin: budget?.min ?? 0, budgetMax: budget?.max ?? null, priority: prio?.id ?? null };
    api
      .desk(input)
      .then((tiers) => {
        if (!live) return;
        setRes({ key, tiers, now: Date.now() });
        // Templates paint first; the agent's grounded rewrite swaps the text in place (same shape, same line counts).
        api.explain(tiers, input, state.agentSessionId).then(
          (ex) => live && setRes((r) => (r?.key === key && r.tiers ? { ...r, tiers: r.tiers.map((t) => ({ ...t, ...ex[t.productId] })) } : r)),
          () => {}, // timeout or agent down: the templates stay
        );
      })
      .catch(() => live && setRes({ key, error: true }));
    return () => {
      live = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- `key` covers every input
  }, [askable, key]);

  const tiers = res?.key === key ? res.tiers : undefined;
  // TOGGLE_COMPARE caps the list at 3, so ids from an earlier desk would block «مقایسه»; drop them.
  useEffect(() => {
    if (tiers) for (const id of staleCompareIds(state.compare, tiers)) dispatch({ type: "TOGGLE_COMPARE", id });
  }, [tiers, state.compare, dispatch]);

  const edit = () => dispatch({ type: "GO", stage: "consult" });
  const editBtn = (
    <Btn variant="ghost" onClick={edit}>
      ویرایش نیازها
    </Btn>
  );
  const current = res?.key === key ? res : null;

  if (ready && !req.category)
    return <EmptyState pose="idle" title="هنوز نیازهات رو نگفتی" body="چند سوال کوتاه، بعد سه گزینه با دلیل." actions={editBtn} />;

  if (current?.error)
    return (
      <EmptyState
        pose="stuck"
        title="میز تصمیم الان باز نشد"
        body="به سرور ترب‌گرد نرسیدم. نیازهات حفظ شدن؛ دوباره امتحان کن."
        actions={
          <>
            <Btn onClick={() => setAttempt((a) => a + 1)}>تلاش دوباره</Btn>
            {editBtn}
          </>
        }
      />
    );

  const empty = ready ? deskEmpty(req.category, current?.tiers) : null;
  const noLimit = req.category && req.category !== "other" ? BUDGETS[req.category].find((b) => b.min === 0 && b.max == null) : undefined;
  if (empty === "budget")
    return (
      <EmptyState
        pose="stuck"
        title="تو این بودجه مدلی با دست‌کم دو فروشنده پیدا نکردم"
        body="نیازهات حفظ شدن؛ بودجه رو باز کن یا نیازها رو عوض کن."
        actions={
          <>
            {noLimit && budget?.id !== noLimit.id && (
              <Btn onClick={() => dispatch({ type: "SET_BUDGET", budgetId: noLimit.id })}>بدون محدودیت بودجه</Btn>
            )}
            {editBtn}
          </>
        }
      />
    );

  if (empty === "other")
    return (
      <EmptyState
        pose="idle"
        title="برای این دسته هنوز میز تصمیم نداریم"
        body="داده‌ی ترب‌گرد فعلاً روی موبایل، لپ‌تاپ و لوازم جانبی گوشیه. نیازهات حفظ شدن؛ با یکی از این دسته‌ها بدون از دست دادن جلسه ادامه بده."
        actions={
          <>
            <Btn
              onClick={() => {
                dispatch({ type: "CHAT_CHIP", chip: { id: "cat:mobile", label: "موبایل" } });
                edit();
              }}
            >
              رفتن به دسته‌ی موبایل
            </Btn>
            {editBtn}
          </>
        }
      />
    );

  const picked = tiers?.filter((t) => state.compare.includes(t.productId)) ?? [];
  const pick = (id: string) => dispatch({ type: "SELECT_PRODUCT", id, advance: true });

  return (
    <>
      {/* Phone/md: title | mascot, chips under. lg: title · chips · mascot in one row. */}
      <div data-page-head className="mt-4 grid animate-rise grid-cols-[minmax(0,1fr)_auto] items-start gap-3 lg:grid-cols-[minmax(0,1fr)_minmax(0,auto)_auto] lg:items-center lg:gap-x-8">
        <div className="min-w-0">
          <h1 className="text-[28px] leading-[40px]">
            <span className="font-light">میز </span>
            <span className="font-extrabold">تصمیم</span>
          </h1>
          <p className="text-[15px] leading-6 text-ink-muted">
            خودم «بهترین» رو انتخاب نمی‌کنم؛ بر اساس چیزهایی که گفتی، هر استراتژی یک مصالحه‌ی متفاوته.
          </p>
        </div>
        <Mascot pose="idle" react="hop" className="size-20 lg:col-start-3 lg:row-start-1" />
        <ReqChips req={req} onEdit={edit} className="col-span-2 lg:col-span-1 lg:col-start-2 lg:row-start-1" />
      </div>

      {tiers ? (
        // lg: five shared rows (pills · product · price · notes · actions); each card subgrids into them so prices line up.
        <div className="mt-5 grid gap-4 [--stagger:60ms] motion-safe:[--rise:12px] lg:mt-8 lg:grid-cols-3 lg:grid-rows-[auto_auto_auto_1fr_auto] lg:gap-x-5">
          {tiers.map((t, i) => (
            <TierCard
              key={t.productId}
              t={t}
              index={i}
              minAgo={t.newestPriceAt ? Math.max(0, Math.round((current!.now! - Date.parse(t.newestPriceAt)) / 60_000)) : null}
              priorityLabel={prio?.label ?? null}
              selected={state.selectedProductId === t.productId}
              inCompare={state.compare.includes(t.productId)}
              onPick={() => pick(t.productId)}
              onCompare={() => dispatch({ type: "TOGGLE_COMPARE", id: t.productId })}
            />
          ))}
        </div>
      ) : (
        <TierSkeletons />
      )}

      {tiers && tiers.length < 3 && (
        <p className="mt-4 text-[13px] leading-6 text-ink-muted">
          {tiers.length === 1 ? "فقط یک مدل" : "فقط دو مدل"} با دست‌کم دو فروشنده تو این بودجه و دسته پیدا کردم، پس سه گزینه نمی‌بینی؛
          برای گزینه‌های بیشتر بودجه رو باز کن.
        </p>
      )}

      {tiers && (
        <p className="mt-4 text-[12px] leading-5 text-ink-muted">
          قیمت‌ها «آخرین قیمتِ ثبت‌شده‌ی فروشگاه»اند و به‌روز بودنشان تضمین نمی‌شود؛ قبل از رفتن زنگ بزن.
        </p>
      )}

      {picked.length >= 2 && (
        <div className="page tray-in fixed inset-x-0 bottom-0 z-30 py-3 pb-[max(12px,env(safe-area-inset-bottom))]">
          <div className="flex items-center gap-3 rounded-md bg-panel px-4 py-3 text-on-dark shadow-sheet lg:px-6">
            <p className="flex-1 text-[14px] font-bold leading-5">
              {/* key: a new count remounts the digit, so it pops in (pop-in, 180 ms) */}
              <span key={picked.length} className="pop-in inline-block">{faNum(picked.length)}</span> مدل برای مقایسه آماده‌ست
              <span className="block text-[12px] font-medium text-on-dark/60">مصالحه‌ها رو شفاف می‌بینی، نه تبلیغ</span>
            </p>
            <Btn onClick={() => setCompareOpen(true)}>باز کردن مقایسه</Btn>
          </div>
        </div>
      )}

      <CompareSheet
        open={compareOpen}
        onClose={() => setCompareOpen(false)}
        tiers={picked}
        hasPriority={!!prio}
        now={current?.now ?? 0}
        onPick={(id) => {
          setCompareOpen(false);
          pick(id);
        }}
      />
    </>
  );
}

export default function DeskPage() {
  return (
    <JourneyShell stage="products">
      <main className="page pb-32 pt-2">
        <Desk />
      </main>
    </JourneyShell>
  );
}
