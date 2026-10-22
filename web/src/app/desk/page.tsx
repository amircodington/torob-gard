"use client";

import { useEffect, useState } from "react";
import { CompareSheet } from "../../components/desk/CompareSheet";
import { ReqChips } from "../../components/desk/ReqChips";
import { TierCard } from "../../components/desk/TierCard";
import { deskEmpty, staleCompareIds } from "../../components/desk/compare";
import { JourneyShell } from "../../components/JourneyShell";
import { Mascot } from "../../components/Mascot";
import { Btn } from "../../components/ui/Btn";
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
    api
      .desk({ category: req.category!, budgetMin: budget?.min ?? 0, budgetMax: budget?.max ?? null, priority: prio?.id ?? null })
      .then((tiers) => live && setRes({ key, tiers, now: Date.now() }))
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
      <div className="flex items-start gap-3">
        <div className="min-w-0 flex-1">
          <h1 className="mt-4 text-[28px] leading-[40px]">
            <span className="font-light">میز </span>
            <span className="font-extrabold">تصمیم</span>
          </h1>
          <p className="text-[15px] leading-6 text-ink-muted">
            خودم «بهترین» رو انتخاب نمی‌کنم؛ بر اساس چیزهایی که گفتی، هر استراتژی یک مصالحه‌ی متفاوته.
          </p>
        </div>
        {/* ponytail: the mascot WebPs carry an opaque grey ground, so they sit cropped in a circle until transparent exports land. */}
        <Mascot pose="idle" className="mt-4 h-20 w-20 shrink-0 rounded-full object-cover object-top" />
      </div>
      <div className="mt-3">
        <ReqChips req={req} onEdit={edit} />
      </div>

      {tiers ? (
        <div className="mt-5 grid gap-4 md:grid-cols-3">
          {tiers.map((t) => (
            <TierCard
              key={t.productId}
              t={t}
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
        <div aria-busy="true" aria-label="در حال آماده کردن گزینه‌ها" className="mt-5 grid gap-4 md:grid-cols-3">
          {[0, 1, 2].map((i) => (
            <div key={i} className="h-[420px] rounded-lg bg-surface-tint motion-safe:animate-pulse" />
          ))}
        </div>
      )}

      {tiers && (
        <p className="mt-4 text-[12px] leading-5 text-ink-muted">
          قیمت‌ها «آخرین قیمتِ ثبت‌شده‌ی فروشگاه»اند و به‌روز بودنشان تضمین نمی‌شود؛ قبل از رفتن زنگ بزن.
        </p>
      )}

      {picked.length >= 2 && (
        <div className="fixed inset-x-0 bottom-0 z-30 mx-auto w-full max-w-md p-3 pb-[max(12px,env(safe-area-inset-bottom))]">
          <div className="flex items-center gap-3 rounded-md bg-panel px-4 py-3 text-on-dark shadow-sheet">
            <p className="flex-1 text-[14px] font-bold leading-5">
              {faNum(picked.length)} مدل برای مقایسه آماده‌ست
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
      <main className="mx-auto max-w-md px-4 pb-32 pt-2 md:max-w-5xl">
        <Desk />
      </main>
    </JourneyShell>
  );
}
