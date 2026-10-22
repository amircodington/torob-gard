"use client";

import { useLayoutEffect, useRef, type ReactNode } from "react";
import { Flip } from "gsap/Flip";
import { registerMotion, reduced } from "../../lib/motion";
import { InChipGroup } from "./Chip";

/** Chips with one orange pill that slides to the pressed chip (P1 moment 2: 220 ms tg.out; reduced motion jumps). */
export function ChipGroup({ label, children }: { label: string; children: ReactNode }) {
  const group = useRef<HTMLDivElement>(null);
  const pill = useRef<HTMLSpanElement>(null);

  // Runs after every render: a chip's aria-pressed or its width (13px → 15px text) may have changed.
  useLayoutEffect(() => {
    registerMotion(); // Flip.getState needs the plugin registered
    const g = group.current!;
    const p = pill.current!;
    const place = (animate: boolean) => {
      const on = g.querySelector<HTMLElement>('[aria-pressed="true"]');
      const box = (s: CSSStyleDeclaration) => `${s.left},${s.top},${s.width},${s.height}`;
      const was = p.style.left ? box(p.style) : ""; // empty until the first placement: no tween from nowhere
      const state = animate && was && on ? Flip.getState(p) : null;
      p.hidden = !on;
      if (!on) return;
      Object.assign(p.style, { left: `${on.offsetLeft}px`, top: `${on.offsetTop}px`, width: `${on.offsetWidth}px`, height: `${on.offsetHeight}px` });
      if (state && !reduced() && box(p.style) !== was) {
        Flip.from(state, { duration: 0.22, ease: "tg.out" });
      }
    };
    place(true);
    if (typeof ResizeObserver === "undefined") return;
    const ro = new ResizeObserver(() => place(false)); // wrapping changes at a breakpoint: follow without a tween
    ro.observe(g);
    return () => ro.disconnect();
  });

  return (
    <div ref={group} role="group" aria-label={label} className="relative flex flex-wrap gap-2">
      <span ref={pill} data-pill aria-hidden hidden className="absolute rounded-pill bg-orange shadow-pin" />
      <InChipGroup.Provider value={true}>{children}</InChipGroup.Provider>
    </div>
  );
}
