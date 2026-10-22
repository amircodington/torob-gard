"use client";

import { useLayoutEffect, useRef, type ReactNode } from "react";
import { Flip } from "gsap/Flip";
import { registerMotion, reduced } from "../../lib/motion";
import { InChipGroup } from "./Chip";

const box = (s: CSSStyleDeclaration) => `${s.left},${s.top},${s.width},${s.height}`;

/** Puts the pill on the pressed chip; tweens from where it was unless this is the first placement or motion is reduced. */
function place(g: HTMLElement, p: HTMLElement, animate: boolean) {
  const on = g.querySelector<HTMLElement>('[aria-pressed="true"]');
  const was = p.style.left ? box(p.style) : ""; // empty until the first placement: no tween from nowhere
  const state = animate && was && on ? Flip.getState(p) : null;
  p.hidden = !on;
  if (!on) return;
  Object.assign(p.style, { left: `${on.offsetLeft}px`, top: `${on.offsetTop}px`, width: `${on.offsetWidth}px`, height: `${on.offsetHeight}px` });
  if (state && !reduced() && box(p.style) !== was) Flip.from(state, { duration: 0.22, ease: "tg.out" });
}

/** Chips on one white track with one orange pill that slides to the pressed chip (P1 moment 2: 220 ms tg.out; reduced motion jumps). */
export function ChipGroup({ label, children }: { label: string; children: ReactNode }) {
  const group = useRef<HTMLDivElement>(null);
  const pill = useRef<HTMLSpanElement>(null);

  // After every render: a chip's aria-pressed or its width (13px → 15px text) may have changed.
  useLayoutEffect(() => {
    registerMotion(); // Flip.getState needs the plugin registered
    place(group.current!, pill.current!, true);
    group.current!.dataset.ready = ""; // from now on the pill, not the chip, is the orange shape
  });

  // Wrapping changes at a breakpoint: follow without a tween.
  useLayoutEffect(() => {
    if (typeof ResizeObserver === "undefined") return;
    const g = group.current!;
    const ro = new ResizeObserver(() => place(g, pill.current!, false));
    ro.observe(g);
    return () => ro.disconnect();
  }, []);

  return (
    // rounded-[1.625rem]: a pill on one row (44px chips + 4px padding), a soft card when it wraps
    <div ref={group} role="group" aria-label={label} className="group/chips relative flex flex-wrap gap-1 rounded-[1.625rem] bg-surface p-1 shadow-card">
      <span ref={pill} data-pill aria-hidden hidden className="absolute rounded-pill bg-orange shadow-pin" />
      <InChipGroup.Provider value={true}>{children}</InChipGroup.Provider>
    </div>
  );
}
