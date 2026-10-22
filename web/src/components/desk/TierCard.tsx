"use client";

import { useState } from "react";
import { faNum, faPrice } from "../../lib/fa";
import type { DeskTier, Tier } from "../../lib/types";
import { Mascot } from "../Mascot";
import { Btn } from "../ui/Btn";
import { FreshBadge } from "../ui/FreshBadge";

export const TIER_LABEL: Record<Tier, string> = {
  budget: "اقتصادی",
  balanced: "متعادل و مناسب نیاز",
  feature: "امکانات بیشتر",
};

function ProductImage({ src, alt }: { src: string | null; alt: string }) {
  const [broken, setBroken] = useState(false);
  if (!src || broken)
    return (
      <Mascot pose="idle" className="h-24 w-24 shrink-0 rounded-full object-cover object-top" />
    );
  return (
    // ponytail: plain <img>; Torob images are allowed from outside and next/image would proxy them.
    // eslint-disable-next-line @next/next/no-img-element
    <img src={src} alt={alt} onError={() => setBroken(true)} className="h-24 w-24 shrink-0 rounded-md bg-surface object-contain" />
  );
}

export function TierCard({
  t,
  minAgo,
  priorityLabel,
  selected,
  inCompare,
  onPick,
  onCompare,
}: {
  t: DeskTier;
  minAgo: number | null; // minutes since the newest price; null = not recorded
  priorityLabel: string | null;
  selected: boolean;
  inCompare: boolean;
  onPick: () => void;
  onCompare: () => void;
}) {
  const [why, setWhy] = useState(false);
  const whyId = `why-${t.productId}`;

  return (
    <article className={`flex flex-col rounded-lg bg-surface p-5 shadow-card ${selected ? "ring-2 ring-orange" : ""}`}>
      <div className="flex flex-wrap items-center gap-2">
        <span className="rounded-pill bg-panel px-3 py-1 text-[13px] font-bold text-on-dark">{TIER_LABEL[t.tier]}</span>
        {t.tier === "balanced" && (
          <span className="rounded-pill bg-orange px-3 py-1 text-[15px] font-bold text-on-orange">پیشنهاد ترب‌گرد</span>
        )}
      </div>

      <div className="mt-4 flex items-start gap-3">
        <ProductImage src={t.imageUrl} alt={t.title} />
        <div className="min-w-0 flex-1">
          <h3 className="break-words text-[16px] font-extrabold leading-6">{t.title}</h3>
          {t.brand && <p className="text-[13px] text-ink-muted">{t.brand}</p>}
          <ul className="mt-1.5 space-y-0.5">
            {t.specsTop3.map((s) => (
              <li key={s.label} className="text-[13px] leading-5 text-ink-muted">
                <span className="font-bold text-ink">{s.label}:</span> {faNum(s.value)}
              </li>
            ))}
          </ul>
        </div>
      </div>

      <div className="mt-4 rounded-md bg-surface-tint p-3">
        <div className="flex items-baseline justify-between gap-2">
          <span className="tabular text-[22px] font-bold">{faPrice(t.price)}</span>
          <span className="text-[13px] font-semibold text-ink-muted">{faNum(t.offerCount)} فروشگاه</span>
        </div>
        {minAgo === null ? (
          <span className="text-[12px] font-semibold text-signal">کمترین قیمت: زمانش ثبت نشده · ممکن است تغییر کرده باشد</span>
        ) : (
          <FreshBadge updatedMinAgo={minAgo} prefix="کمترین قیمت: " />
        )}
      </div>

      <p className="mt-3 text-[14px] leading-6 text-ink-muted">{faNum(t.fitNote)}</p>
      {t.fitsPriority && priorityLabel && (
        <p className="mt-1 text-[13px] font-bold text-verified">با اولویتت ({priorityLabel}) هم‌خوانی مستقیم داره</p>
      )}

      <button
        type="button"
        aria-expanded={why}
        aria-controls={whyId}
        onClick={() => setWhy((v) => !v)}
        className="mt-3 flex min-h-11 items-center justify-between rounded-md bg-surface-tint px-3 text-[14px] font-bold focus-visible:outline-2 focus-visible:outline-focus"
      >
        چرا این گزینه؟
        <span aria-hidden className={`text-[18px] transition-transform ${why ? "rotate-45" : ""}`}>+</span>
      </button>
      {why && (
        <div id={whyId} className="mt-2 space-y-1.5 px-1 text-[13px] leading-6">
          {t.bullets.map((b) => (
            <p key={b}>✓ {faNum(b)}</p>
          ))}
          {t.tradeoffs.length > 0 && <p className="pt-1 text-[12px] font-extrabold text-ink-muted">کجا کوتاه می‌آد (صادقانه):</p>}
          {t.tradeoffs.map((x) => (
            <p key={x} className="text-ink-muted">− {faNum(x)}</p>
          ))}
        </div>
      )}

      <div className="mt-auto flex gap-2 pt-4">
        <Btn className="flex-1" onClick={onPick}>
          {selected ? "انتخاب شد — رادار فروشگاه" : "انتخاب این مدل"}
        </Btn>
        <Btn variant={inCompare ? "panel" : "ghost"} aria-pressed={inCompare} onClick={onCompare}>
          مقایسه
        </Btn>
      </div>
    </article>
  );
}
