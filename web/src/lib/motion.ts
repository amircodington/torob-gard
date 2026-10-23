import { gsap } from "gsap";
import { CustomEase } from "gsap/CustomEase";
import { Flip } from "gsap/Flip";

/** Seconds; the same values as the --duration-* tokens in globals.css (motion.test.ts keeps them equal). */
export const DUR = { press: 0.12, fast: 0.18, base: 0.24, sheet: 0.32, slow: 0.6 } as const;
export const REDUCED = "(prefers-reduced-motion: reduce)";

let registered = false;

/** Registers Flip and the three brand curves as "tg.out", "tg.inOut", "tg.drawer". Safe to call from every effect. */
export function registerMotion(): void {
  if (registered) return;
  registered = true;
  gsap.registerPlugin(Flip, CustomEase);
  CustomEase.create("tg.out", ".23,1,.32,1");
  CustomEase.create("tg.inOut", ".77,0,.175,1");
  CustomEase.create("tg.drawer", ".32,.72,0,1");
}

/** Seconds between items of a JS-staggered group of `n`: 40 ms, tightened so the last one starts within `budget` s (Task 4). */
export const staggerStep = (n: number, budget = 0.3) => Math.min(0.04, budget / Math.max(1, n - 1));

export const reduced = () => typeof window !== "undefined" && window.matchMedia(REDUCED).matches;

// Last input modality, read when a move starts: a keyboard action jumps, a pointer action animates (Global Constraint).
// Also mirrored on <html data-input> so CSS transitions (chevrons) can opt out with `in-data-[input=keyboard]:`.
let keyboard = false;
function track(e: Event) {
  keyboard = e.type === "keydown";
  document.documentElement.dataset.input = keyboard ? "keyboard" : "pointer";
}
if (typeof document !== "undefined") {
  document.addEventListener("keydown", track, true);
  document.addEventListener("pointerdown", track, true);
}
export const byKeyboard = () => keyboard;
