"use client";

import { toFaDigits } from "../lib/persian";
import { resetStorage, STAGE_ORDER, useSession, type Stage } from "../state/session";

const LABELS: Record<Stage, string> = {
  consult: "نیازها",
  products: "میز تصمیم",
  radar: "رادار فروشگاه",
  summary: "آماده‌ی رفتن",
};

const glass = "bg-white/55 backdrop-blur-md";

export function TopBar() {
  const { state, dispatch } = useSession();
  const cur = STAGE_ORDER.indexOf(state.stage);
  const max = STAGE_ORDER.indexOf(state.maxStage);

  return (
    <header className="sticky top-0 z-40 mx-auto flex max-w-md items-center gap-2 px-4 py-2">
      <span className="text-[17px] leading-none">
        <span className="font-light">ترب‌</span>
        <span className="font-extrabold">گرد</span>
      </span>

      <nav aria-label="مراحل خرید" className="ms-auto flex items-center gap-1.5">
        {STAGE_ORDER.map((stage, i) => {
          const active = i === cur;
          return (
            <button
              key={stage}
              type="button"
              disabled={i > max}
              aria-label={LABELS[stage]}
              aria-current={active ? "step" : undefined}
              title={LABELS[stage]}
              onClick={() => dispatch({ type: "GO", stage })}
              className={`tabular grid h-11 w-11 place-items-center rounded-full text-[15px] font-bold transition-colors focus-visible:outline-2 focus-visible:outline-focus disabled:opacity-40 ${
                active ? "bg-orange text-on-orange" : `${glass} text-ink`
              }`}
            >
              {toFaDigits(String(i + 1))}
            </button>
          );
        })}
      </nav>

      <button
        type="button"
        aria-label="شروع دوباره"
        title="شروع دوباره"
        onClick={() => {
          resetStorage();
          dispatch({ type: "RESET" });
        }}
        className={`${glass} grid h-11 w-11 place-items-center rounded-full text-ink focus-visible:outline-2 focus-visible:outline-focus`}
      >
        <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth={1.75} strokeLinecap="round" strokeLinejoin="round" aria-hidden>
          <path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8" />
          <path d="M3 3v5h5" />
        </svg>
      </button>
    </header>
  );
}
