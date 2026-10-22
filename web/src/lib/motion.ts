import { gsap } from "gsap";
import { CustomEase } from "gsap/CustomEase";
import { Flip } from "gsap/Flip";

/** Seconds; the same values as the --duration-* tokens in globals.css (motion.test.ts keeps them equal). */
export const DUR = { press: 0.12, fast: 0.18, base: 0.24, sheet: 0.32, slow: 0.6 } as const;
export const STAGGER = 0.04;
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

export const reduced = () => typeof window !== "undefined" && window.matchMedia(REDUCED).matches;
