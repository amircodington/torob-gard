"use client";

import { useRouter } from "next/navigation";
import { ClipboardCheck, MessagesSquare, Radar, RotateCcw, Scale, type LucideIcon } from "lucide-react";
import { toFaDigits } from "../lib/persian";
import { resetStorage, STAGE_ORDER, stagePath, useSession, type Stage } from "../state/session";
import { Wordmark } from "./Wordmark";
import { useSlidingPill } from "./ui/ChipGroup";

const STEPS: Record<Stage, { label: string; icon: LucideIcon }> = {
  consult: { label: "نیازها", icon: MessagesSquare },
  products: { label: "میز تصمیم", icon: Scale },
  radar: { label: "رادار فروشگاه", icon: Radar },
  summary: { label: "آماده‌ی رفتن", icon: ClipboardCheck },
};

const glass = "bg-white/55"; // the header behind already blurs; no second backdrop-filter

export function TopBar() {
  const { state, dispatch } = useSession();
  const router = useRouter();
  const cur = STAGE_ORDER.indexOf(state.stage);
  const max = STAGE_ORDER.indexOf(state.maxStage);
  // Every journey page mounts its own TopBar; the "topbar" memo lets the pill slide on from the previous page's step.
  const { group, pill } = useSlidingPill<HTMLElement>('[aria-current="step"]', "topbar");

  return (
    // Full-width blurred paper so chat text never shows through the wordmark when it scrolls under.
    <header className="sticky top-0 z-40 bg-paper/80 backdrop-blur-md">
      <div className="page flex items-center gap-2 py-1.5">
        <Wordmark />

        <nav ref={group} aria-label="مراحل خرید" className={`group/steps relative ms-auto flex items-center gap-0.5 rounded-pill p-0.5 ${glass}`}>
          <span ref={pill} data-pill aria-hidden hidden className="absolute rounded-pill bg-orange shadow-pin" />
          {STAGE_ORDER.map((stage, i) => {
            const active = i === cur;
            const { label, icon: Icon } = STEPS[stage];
            // Step ۴ has a page only once a trip is saved; until then it is visibly dead, not a silent no-op.
            // The current step is never dead: a shared /trip link has no journey state but is on step ۴.
            const path = stagePath({ ...state, stage });
            const dead = stage === "summary" && path == null && !active;
            return (
              <button
                key={stage}
                type="button"
                disabled={i > max}
                aria-disabled={dead || undefined}
                aria-label={label}
                aria-current={active ? "step" : undefined}
                title={label}
                onClick={() => {
                  if (dead) return;
                  dispatch({ type: "GO", stage });
                  if (stage === "summary" && path) router.push(path);
                }}
                // relative: paints above the pill. Below lg a 44px digit; at lg a pill with the stage icon and label.
                // The active step keeps its own orange until the pill is placed (SSR, before hydration).
                className={`tabular relative flex h-11 min-w-11 items-center justify-center gap-1.5 rounded-pill text-[15px] font-bold transition-[background-color,color,scale] duration-220 ease-out focus-visible:outline-2 focus-visible:outline-focus disabled:opacity-40 aria-disabled:opacity-40 motion-safe:active:scale-[0.97] lg:px-4 ${
                  active ? "bg-orange text-on-orange group-data-ready/steps:bg-transparent" : "text-ink"
                }`}
              >
                <span data-step-num className="lg:hidden">
                  {toFaDigits(String(i + 1))}
                </span>
                <Icon aria-hidden className="hidden size-5 shrink-0 lg:block" />
                <span className="hidden lg:inline">{label}</span>
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
          className={`${glass} grid h-11 w-11 place-items-center rounded-full text-ink lift press focus-visible:outline-2 focus-visible:outline-focus`}
        >
          <RotateCcw aria-hidden className="hover-spin h-5 w-5" />
        </button>
      </div>
    </header>
  );
}
