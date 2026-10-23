"use client";

import { img } from "../../lib/img";
import { useState, type CSSProperties } from "react";
import {
  ArrowRight,
  BatteryFull,
  Camera,
  Check,
  ChevronDown,
  CircleCheck,
  Cpu,
  Dot,
  HardDrive,
  Minus,
  PiggyBank,
  Plus,
  Scale,
  Sparkles,
  Star,
  Store,
  TriangleAlert,
  Weight,
  type LucideIcon,
} from "lucide-react";
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
export const TIER_ICON: Record<Tier, LucideIcon> = { budget: PiggyBank, balanced: Scale, feature: Sparkles };

// By label fragment, first match wins: «رم» before «حافظه» so «حافظه رم» reads as RAM.
const SPEC_ICON: [string, LucideIcon][] = [
  ["رم", Cpu],
  ["RAM", Cpu],
  ["پردازنده", Cpu],
  ["حافظه", HardDrive],
  ["باتری", BatteryFull],
  ["دوربین", Camera],
  ["وزن", Weight],
];
const specIcon = (label: string) => SPEC_ICON.find(([k]) => label.includes(k))?.[1] ?? Dot;

/** Plus→Check: both stacked in one cell, the inactive one at 0.9 and transparent (reduced motion: opacity only). */
const swap = (on: boolean) =>
  `col-start-1 row-start-1 size-5 transition-[opacity,scale] duration-(--duration-fast) ease-(--ease-out) ${on ? "" : "opacity-0 scale-90 motion-reduce:scale-100"}`;

function ProductImage({ src, alt }: { src: string | null; alt: string }) {
  const [broken, setBroken] = useState(false);
  if (!src || broken) return <Mascot pose="idle" className="size-24 lg:size-32 lg:self-center" />;
  return (
    // ponytail: plain <img>; Torob images are allowed from outside and next/image would proxy them.
    // eslint-disable-next-line @next/next/no-img-element
    <img src={img(src)} alt={alt} onError={() => setBroken(true)} className="size-24 shrink-0 rounded-md bg-surface object-contain lg:h-32 lg:w-full" />
  );
}

/**
 * One tier. Five direct children so the desk's lg grid can subgrid them into rows shared by all three cards:
 * pills · image+title+specs · price box · notes · actions. At md the image block and the price box sit side by side.
 */
export function TierCard({
  t,
  index,
  minAgo,
  priorityLabel,
  selected,
  inCompare,
  onPick,
  onCompare,
}: {
  t: DeskTier;
  /** Position on the desk: drives the 60 ms entrance stagger. */
  index: number;
  minAgo: number | null; // minutes since the newest price; null = not recorded
  priorityLabel: string | null;
  selected: boolean;
  inCompare: boolean;
  onPick: () => void;
  onCompare: () => void;
}) {
  const [why, setWhy] = useState(false);
  const whyId = `why-${t.productId}`;
  const TierIcon = TIER_ICON[t.tier];
  const balanced = t.tier === "balanced";

  return (
    <article
      style={{ "--i": index } as CSSProperties}
      // Balanced lifts at lg by growing upward (-mt + pt), not by translate, so its price box stays on the shared row.
      className={`lift grid animate-rise stagger content-start gap-3 rounded-lg bg-surface p-5 shadow-card md:max-lg:grid-cols-2 md:max-lg:gap-x-5 lg:row-span-5 lg:grid-rows-subgrid ${
        balanced || selected ? "ring-2 ring-orange" : ""
      } ${balanced ? "lg:-mt-2 lg:pt-7" : ""}`}
    >
      <div className="flex flex-wrap items-center gap-2 md:max-lg:col-span-2">
        <span className="inline-flex items-center gap-1.5 rounded-pill bg-panel px-3 py-1 text-[13px] font-bold text-on-dark">
          <TierIcon aria-hidden className="hover-hop size-4" />
          {TIER_LABEL[t.tier]}
        </span>
        {balanced && (
          <span className="inline-flex items-center gap-1.5 rounded-pill bg-orange px-3 py-1 text-[13px] font-bold text-on-orange">
            <Star aria-hidden className="size-4 fill-current" />
            پیشنهاد ترب‌گرد
          </span>
        )}
      </div>

      <div className="flex min-w-0 items-start gap-3 lg:flex-col lg:items-stretch">
        <ProductImage src={t.imageUrl} alt={t.title} />
        <div className="min-w-0 flex-1">
          <h3 title={t.title} className="text-[16px] font-extrabold leading-6 [overflow-wrap:anywhere] lg:line-clamp-3">
            {t.title}
          </h3>
          {t.brand && <p className="text-[13px] text-ink-muted">{t.brand}</p>}
          <ul className="mt-1.5 space-y-1">
            {t.specsTop3.map((s) => {
              const Icon = specIcon(s.label);
              return (
                <li key={s.label} className="flex items-start gap-1.5 text-[13px] leading-5 text-ink-muted">
                  <Icon aria-hidden className="mt-0.5 size-4" />
                  <span className="min-w-0">
                    <span className="font-bold text-ink">{s.label}:</span> {faNum(s.value)}
                  </span>
                </li>
              );
            })}
          </ul>
        </div>
      </div>

      <div data-price-box className="rounded-md bg-surface-tint p-3 md:max-lg:self-start">
        <div className="flex flex-wrap items-baseline justify-between gap-x-2">
          <span className="tabular text-[22px] font-bold leading-8">{faPrice(t.price)}</span>
          <span className="inline-flex items-center gap-1 whitespace-nowrap text-[13px] font-semibold text-ink-muted">
            <Store aria-hidden className="size-4" />
            {faNum(t.offerCount)} فروشگاه
          </span>
        </div>
        {minAgo === null ? (
          <span className="inline-flex items-start gap-1 text-[12px] font-semibold leading-5 text-signal">
            <TriangleAlert aria-hidden className="mt-[3px] size-3.5" />
            <span>کمترین قیمت: زمانش ثبت نشده · ممکن است تغییر کرده باشد</span>
          </span>
        ) : (
          <FreshBadge updatedMinAgo={minAgo} prefix="کمترین قیمت: " />
        )}
      </div>

      <div className="flex flex-col gap-2 md:max-lg:col-span-2">
        <p className="text-[14px] leading-6 text-ink-muted">{faNum(t.fitNote)}</p>
        {t.fitsPriority && priorityLabel && (
          <p className="flex items-start gap-1.5 text-[13px] font-bold leading-5 text-verified">
            <CircleCheck aria-hidden className="size-4" />
            با اولویتت ({priorityLabel}) هم‌خوانی مستقیم داره
          </p>
        )}
        <button
          type="button"
          aria-expanded={why}
          aria-controls={whyId}
          onClick={() => setWhy((v) => !v)}
          className="mt-1 flex min-h-11 items-center justify-between rounded-md bg-surface-tint px-3 text-[14px] font-bold press [--press:0.98] hover:bg-line focus-visible:outline-2 focus-visible:outline-focus"
        >
          چرا این گزینه؟
          <ChevronDown aria-hidden className={`size-5 transition-transform duration-(--duration-fast) ease-(--ease-out) motion-reduce:transition-none in-data-[input=keyboard]:transition-none ${why ? "rotate-180" : ""}`} />
        </button>
        {why && (
          <div id={whyId} className="animate-rise space-y-1.5 px-1 text-[13px] leading-6 [--rise:4px] in-data-[input=keyboard]:animate-none">
            {t.bullets.map((b) => (
              <p key={b} className="flex items-start gap-1.5">
                <Check aria-hidden className="mt-1 size-4 text-verified" />
                <span className="min-w-0">{faNum(b)}</span>
              </p>
            ))}
            {t.tradeoffs.length > 0 && <p className="pt-1 text-[12px] font-extrabold text-ink-muted">کجا کوتاه می‌آد (صادقانه):</p>}
            {t.tradeoffs.map((x) => (
              <p key={x} className="flex items-start gap-1.5 text-ink-muted">
                <Minus aria-hidden className="mt-1 size-4" />
                <span className="min-w-0">{faNum(x)}</span>
              </p>
            ))}
          </div>
        )}
      </div>

      <div className="flex items-end gap-2 md:max-lg:col-span-2">
        <Btn className="flex-1" icon={ArrowRight} iconEnd onClick={onPick}>
          {selected ? "انتخاب شد — رادار فروشگاه" : "انتخاب این مدل"}
        </Btn>
        <Btn variant={inCompare ? "panel" : "ghost"} aria-pressed={inCompare} onClick={onCompare}>
          <span aria-hidden className="grid">
            <Plus className={swap(!inCompare)} />
            <Check className={`${swap(inCompare)} ${inCompare ? "draw-in" : ""}`} />
          </span>
          {/* 1024–1279: three cards are too narrow for both labels, so «انتخاب این مدل» keeps one line and this goes icon-only */}
          <span className="lg:max-xl:sr-only">مقایسه</span>
        </Btn>
      </div>
    </article>
  );
}
