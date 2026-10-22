"use client";

import { useLayoutEffect, useRef, type ReactNode } from "react";
import { Flip } from "gsap/Flip";
import { registerMotion, reduced } from "../../lib/motion";
import { InChipGroup } from "./Chip";

const box = (s: CSSStyleDeclaration) => `${s.left},${s.top},${s.width},${s.height}`;
type Box = Pick<CSSStyleDeclaration, "left" | "top" | "width" | "height">;

// Last pill box per `memo` key: a group that remounts on the next page (the TopBar) slides on from where it was.
const lastBox = new Map<string, Box>();

/** Puts the pill on the `on` element; tweens from where it was unless this is the first placement or motion is reduced. */
function place(g: HTMLElement, p: HTMLElement, sel: string, animate: boolean, memo?: string) {
  const on = g.querySelector<HTMLElement>(sel);
  const prev = memo ? lastBox.get(memo) : undefined;
  if (!p.style.left && prev && animate) Object.assign(p.style, prev);
  const was = p.style.left ? box(p.style) : ""; // empty until the first placement: no tween from nowhere
  const state = animate && was && on ? Flip.getState(p) : null;
  p.hidden = !on;
  if (!on) return;
  Object.assign(p.style, { left: `${on.offsetLeft}px`, top: `${on.offsetTop}px`, width: `${on.offsetWidth}px`, height: `${on.offsetHeight}px` });
  if (memo) lastBox.set(memo, { left: p.style.left, top: p.style.top, width: p.style.width, height: p.style.height });
  if (state && !reduced() && box(p.style) !== was) Flip.from(state, { duration: 0.22, ease: "tg.out" });
}

/** One orange pill under the element matching `sel` inside the group (P1 moment 2: 220 ms tg.out; reduced motion jumps). */
export function useSlidingPill<T extends HTMLElement>(sel: string, memo?: string) {
  const group = useRef<T>(null);
  const pill = useRef<HTMLSpanElement>(null);

  // After every render: the selection or its width (13px → 15px text) may have changed.
  useLayoutEffect(() => {
    registerMotion(); // Flip.getState needs the plugin registered
    place(group.current!, pill.current!, sel, true, memo);
    group.current!.dataset.ready = ""; // from now on the pill, not the item, is the orange shape
  });

  // Wrapping changes at a breakpoint: follow without a tween.
  useLayoutEffect(() => {
    if (typeof ResizeObserver === "undefined") return;
    const g = group.current!;
    const ro = new ResizeObserver(() => place(g, pill.current!, sel, false, memo));
    ro.observe(g);
    return () => ro.disconnect();
  }, [sel, memo]);

  return { group, pill };
}

/** Chips on one white track with one orange pill that slides to the pressed chip. */
export function ChipGroup({ label, children }: { label: string; children: ReactNode }) {
  const { group, pill } = useSlidingPill<HTMLDivElement>('[aria-pressed="true"]');

  return (
    // rounded-[1.625rem]: a pill on one row (44px chips + 4px padding), a soft card when it wraps
    <div ref={group} role="group" aria-label={label} className="group/chips relative flex flex-wrap gap-1 rounded-[1.625rem] bg-surface p-1 shadow-card">
      <span ref={pill} data-pill aria-hidden hidden className="absolute rounded-pill bg-orange shadow-pin" />
      <InChipGroup.Provider value={true}>{children}</InChipGroup.Provider>
    </div>
  );
}
