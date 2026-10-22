"use client";

import { useLayoutEffect, useRef } from "react";
import { gsap } from "gsap";
import { Check } from "lucide-react";
import { DUR, REDUCED, registerMotion } from "../../lib/motion";

const DOTS = 6;

/**
 * Walk mode's one rare moment («داشت؟» → آره): the verified check settles (scale 0.9→1 + fade, 240 ms) while
 * six orange dots burst 28 px out and fade (600 ms), with a 12 ms buzz. Reduced motion: the check fades in, no dots, no buzz.
 */
export function Success() {
  const root = useRef<HTMLDivElement>(null);
  useLayoutEffect(() => {
    registerMotion();
    const mm = gsap.matchMedia(root.current!);
    mm.add({ calm: REDUCED, full: "(prefers-reduced-motion: no-preference)" }, ({ conditions }) => {
      if (conditions!.calm) {
        gsap.from("[data-check], [data-copy]", { opacity: 0, duration: DUR.base });
        return;
      }
      navigator.vibrate?.(12);
      gsap
        .timeline()
        .from("[data-check]", { scale: 0.9, opacity: 0, duration: DUR.base, ease: "tg.out" })
        .fromTo(
          "[data-dot]",
          { x: 0, y: 0, opacity: 1 },
          {
            x: (i) => Math.cos((i / DOTS) * 2 * Math.PI) * 28,
            y: (i) => Math.sin((i / DOTS) * 2 * Math.PI) * 28,
            opacity: 0,
            duration: DUR.slow,
            ease: "tg.out",
          },
          0,
        )
        .from("[data-copy]", { opacity: 0, duration: DUR.base, ease: "tg.out" }, DUR.fast);
    });
    return () => mm.revert();
  }, []);

  return (
    <div ref={root} role="status" className="flex items-center gap-3">
      <span aria-hidden className="relative grid size-12 shrink-0 place-items-center">
        {Array.from({ length: DOTS }, (_, i) => (
          <span key={i} data-dot className="absolute size-2 rounded-full bg-orange opacity-0" />
        ))}
        <span data-check className="relative grid size-12 place-items-center rounded-full bg-verified text-on-dark">
          <Check className="size-6 [stroke-width:2.5]" />
        </span>
      </span>
      <p data-copy className="text-[17px] font-extrabold">
        خرید خوب! 🎉
      </p>
    </div>
  );
}
