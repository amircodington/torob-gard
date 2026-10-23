"use client";

import { useState } from "react";
import { Tag } from "lucide-react";
import { api, type PriceCheck as Check } from "../../lib/api";
import { faNum, faPrice } from "../../lib/fa";
import { toAsciiDigits } from "../../lib/persian";
import { FreshBadge } from "../ui/FreshBadge";

function verdictLine(c: Check): string {
  const pct = c.pctVsMedian ?? 0;
  if (c.verdict === "high") return `${faNum(pct)}٪ بالاتر از میانه‌ی قیمت‌های ثبت‌شده در ترب`;
  if (c.verdict === "below") return `${faNum(-pct)}٪ پایین‌تر از میانه‌ی قیمت‌های ثبت‌شده در ترب`;
  return "در محدوده‌ی قیمت‌های ثبت‌شده در ترب";
}

/** min–max band, median tick and the quoted price on one line; cheapest at the start (right in RTL). */
function Bar({ c, quoted }: { c: Check & { min: number; median: number; max: number }; quoted: number }) {
  const lo = Math.min(c.min, quoted);
  const span = Math.max(c.max, quoted) - lo || 1;
  const at = (v: number) => `${((v - lo) / span) * 100}%`;
  return (
    <div className="relative mt-3 h-2 rounded-pill bg-surface-tint" aria-hidden>
      {/* the range grows from inline-start, then the quoted price pops onto it */}
      <div className="absolute inset-y-0 origin-right animate-grow rounded-pill bg-ink/25" style={{ insetInlineStart: at(c.min), width: `${((c.max - c.min) / span) * 100}%` }} />
      <div className="absolute -inset-y-1 w-0.5 bg-ink" style={{ insetInlineStart: at(c.median) }} />
      <div className="absolute -top-1.5 h-5 w-5 -translate-x-1/2 rounded-full border-2 border-surface bg-orange animate-pop [animation-delay:200ms] rtl:translate-x-1/2" style={{ insetInlineStart: at(quoted) }} />
    </div>
  );
}

export function PriceCheck({ productId }: { productId: string }) {
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState("");
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<{ c: Check; quoted: number; age: number | null } | null>(null);
  const [error, setError] = useState(false);
  const quoted = Number(toAsciiDigits(draft).replace(/\D/g, ""));

  if (!open)
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="mt-3 inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-md bg-panel-2 px-4 text-[15px] font-bold text-on-dark press [--press:0.98] hover:bg-white/15 focus-visible:outline-2 focus-visible:outline-focus"
      >
        <Tag aria-hidden className="hover-wiggle size-4" />
        این قیمت منصفانه‌ست؟
      </button>
    );

  const check = async () => {
    if (!quoted) return;
    setBusy(true);
    setError(false);
    try {
      const c = await api.priceCheck(productId, quoted);
      const age = c.newestPriceAt ? Math.max(0, Math.round((Date.now() - Date.parse(c.newestPriceAt)) / 60_000)) : null;
      setResult({ c, quoted, age });
    } catch {
      setError(true);
    }
    setBusy(false);
  };

  const c = result?.c;
  return (
    <div className="mt-3 animate-rise rounded-lg bg-surface p-5 text-ink">
      <form
        onSubmit={(e) => {
          e.preventDefault();
          check();
        }}
        className="flex items-end gap-2"
      >
        <label className="flex flex-1 flex-col gap-1 text-[12px] font-semibold text-ink-muted">
          قیمتی که فروشنده گفت (تومان)
          <input
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            inputMode="numeric"
            dir="ltr"
            autoFocus
            className="tabular min-h-11 rounded-md bg-surface-tint px-3 text-[16px] text-ink outline-none focus-visible:outline-2 focus-visible:outline-focus"
          />
        </label>
        <button
          type="submit"
          disabled={busy || !quoted}
          className="min-h-11 rounded-md bg-orange px-4 text-[15px] font-bold text-on-orange press focus-visible:outline-2 focus-visible:outline-focus disabled:opacity-50"
        >
          بررسی
        </button>
      </form>
      {error && (
        <p role="alert" className="mt-3 text-[13px]">
          بررسی قیمت الان ممکن نشد؛ دوباره امتحان کن.
        </p>
      )}
      {c && result && (
        <div role="status" className="mt-4 animate-rise">
          {c.min == null || c.median == null || c.max == null ? (
            <p className="text-[15px] leading-6">قیمت ثبت‌شده‌ای برای مقایسه نداریم.</p>
          ) : (
            <>
              <p className="text-[15px] font-bold leading-6">{verdictLine(c)}</p>
              <Bar c={{ ...c, min: c.min, median: c.median, max: c.max }} quoted={result.quoted} />
              <div className="tabular mt-3 flex justify-between gap-2 text-[12px] leading-5 text-ink-muted">
                <span>کمترین {faPrice(c.min)}</span>
                <span>میانه {faPrice(c.median)}</span>
                <span>بیشترین {faPrice(c.max)}</span>
              </div>
              {result.age !== null && (
                <p className="mt-2">
                  <FreshBadge updatedMinAgo={result.age} prefix="تازه‌ترین قیمت: " />
                </p>
              )}
            </>
          )}
        </div>
      )}
    </div>
  );
}
