"use client";

import gsap from "gsap";
import { useEffect, useLayoutEffect, useRef, type PointerEvent, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { X } from "lucide-react";
import { dismiss, rubber } from "../../lib/gesture";
import { DUR, REDUCED, registerMotion } from "../../lib/motion";

const DESK = "(min-width: 1024px)";

/** Inline-start is the right edge in RTL: off-screen there is +100%. */
const edge = (el: HTMLElement | null) => (el && getComputedStyle(el).direction === "rtl" ? 100 : -100);

/**
 * The black sheet. side="auto": a bottom sheet below lg (drag the handle down to dismiss), a side panel docked to the
 * inline-start edge at lg. side="bottom": always a bottom sheet. The sheet owns its open/close motion; onClose runs
 * once the close has finished (Escape closes at once: no animation on a keyboard action).
 */
export function Sheet({
  open,
  onClose,
  labelledby,
  side = "auto",
  children,
}: {
  open: boolean;
  onClose: () => void;
  labelledby: string;
  side?: "auto" | "bottom";
  children: ReactNode;
}) {
  const panel = useRef<HTMLDivElement>(null);
  const scrim = useRef<HTMLDivElement>(null);
  const closeBtn = useRef<HTMLButtonElement>(null);
  const latest = useRef(onClose);
  const drag = useRef<{ grab: number; h: number; y: number; t: number; v: number } | null>(null);
  const closing = useRef(false);
  const dock = side === "auto";

  // Callers may pass an inline onClose; focus and listeners follow `open` only.
  useLayoutEffect(() => {
    latest.current = onClose;
  });

  useEffect(() => {
    if (!open) return;
    closeBtn.current?.focus();
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && latest.current();
    window.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [open]);

  // Open: rises from the bottom (phone) or slides in from the inline-start edge (lg); reduced motion → fades.
  useLayoutEffect(() => {
    if (!open) return;
    registerMotion();
    const mm = gsap.matchMedia();
    // `motion` is there because a conditions handler runs only while at least one condition matches.
    mm.add({ desk: DESK, reduce: REDUCED, motion: "(prefers-reduced-motion: no-preference)" }, (ctx) => {
      const { desk, reduce } = ctx.conditions as { desk: boolean; reduce: boolean };
      if (reduce) return void gsap.from([panel.current, scrim.current], { opacity: 0, duration: DUR.fast });
      const from = desk && dock ? { xPercent: edge(panel.current) } : { yPercent: 100 };
      gsap.from(panel.current, { ...from, duration: DUR.sheet, ease: "tg.drawer" });
      gsap.from(scrim.current, { opacity: 0, duration: DUR.sheet, ease: "tg.drawer" });
    });
    return () => mm.revert();
  }, [open, dock]);

  const close = () => {
    const el = panel.current;
    if (!el || closing.current) return;
    closing.current = true;
    registerMotion();
    const done = () => latest.current();
    if (window.matchMedia(REDUCED).matches) return void gsap.to([el, scrim.current], { opacity: 0, duration: DUR.fast, onComplete: done });
    const to = dock && window.matchMedia(DESK).matches ? { xPercent: edge(el) } : { y: el.offsetHeight, yPercent: 0 };
    gsap.to(scrim.current, { opacity: 0, duration: DUR.base, ease: "tg.drawer" });
    gsap.to(el, { ...to, duration: DUR.base, ease: "tg.drawer", onComplete: done });
  };

  // Drag the handle: 1:1 from where it was grabbed, rubber-band above the top, release → dismiss or snap back.
  const down = (e: PointerEvent<HTMLDivElement>) => {
    const el = panel.current;
    if (!el) return;
    gsap.killTweensOf([el, scrim.current]); // interruptible: a grab mid-open or mid-close takes over from here
    closing.current = false;
    const h = el.offsetHeight;
    const y = Number(gsap.getProperty(el, "y")) + (Number(gsap.getProperty(el, "yPercent")) * h) / 100;
    gsap.set(el, { yPercent: 0, y });
    // A focused price input would keep the keyboard up while the sheet moves under it.
    const focused = document.activeElement;
    if (focused instanceof HTMLElement && focused !== closeBtn.current && el.contains(focused)) focused.blur();
    drag.current = { grab: e.clientY - y, h, y: e.clientY, t: e.timeStamp, v: 0 };
    e.currentTarget.setPointerCapture(e.pointerId);
  };
  const move = (e: PointerEvent) => {
    const d = drag.current;
    if (!d) return;
    const dt = e.timeStamp - d.t;
    if (dt > 0) d.v = 0.8 * ((e.clientY - d.y) / dt) + 0.2 * d.v; // px/ms, smoothed over the last few moves
    d.y = e.clientY;
    d.t = e.timeStamp;
    const y = e.clientY - d.grab;
    gsap.set(panel.current, { y: y < 0 ? rubber(y, d.h) : y });
    gsap.set(scrim.current, { opacity: 1 - Math.max(0, y) / d.h });
  };
  const up = (e: PointerEvent) => {
    const d = drag.current;
    drag.current = null;
    if (!d) return;
    const v = e.timeStamp - d.t > 100 ? 0 : d.v; // the finger stopped before lifting: no fling
    if (dismiss(Number(gsap.getProperty(panel.current, "y")), v, d.h)) return close();
    // ponytail: a fixed 240 ms snap, no velocity hand-off into a spring; upgrade if the snap feels like a wall on device.
    gsap.to(panel.current, { y: 0, duration: DUR.base, ease: "tg.drawer" });
    gsap.to(scrim.current, { opacity: 1, duration: DUR.base, ease: "tg.drawer" });
  };

  if (!open) return null;
  const desk = dock ? "lg:top-0 lg:end-auto lg:mx-0 lg:max-h-none lg:w-[440px] lg:max-w-none lg:rounded-ss-none lg:rounded-ee-sheet" : "";
  return createPortal(
    <div className="fixed inset-0 z-50" role="dialog" aria-modal="true" aria-labelledby={labelledby}>
      <div ref={scrim} aria-hidden onClick={close} className={`absolute inset-0 bg-ink/45 ${dock ? "lg:bg-ink/20" : ""}`} />
      <div
        ref={panel}
        data-sheet-panel
        className={`absolute inset-x-0 bottom-0 mx-auto flex max-h-[90dvh] w-full max-w-2xl flex-col rounded-t-sheet bg-panel text-on-dark shadow-sheet ${desk}`}
      >
        <div
          aria-hidden
          data-sheet-handle
          onPointerDown={down}
          onPointerMove={move}
          onPointerUp={up}
          onPointerCancel={up}
          className={`grid h-11 shrink-0 cursor-grab touch-none select-none place-items-center active:cursor-grabbing ${dock ? "lg:hidden" : ""}`}
        >
          <span className="h-1.5 w-12 rounded-pill bg-panel-2" />
        </div>
        <button
          ref={closeBtn}
          type="button"
          onClick={close}
          aria-label="بستن"
          className={`absolute end-4 top-2 z-10 grid h-11 w-11 place-items-center rounded-full bg-white/12 focus-visible:outline-2 focus-visible:outline-focus ${dock ? "lg:top-4" : ""}`}
        >
          <X className="h-5 w-5" />
        </button>
        <div className={`overflow-y-auto overscroll-contain px-5 pt-2 pb-[max(20px,env(safe-area-inset-bottom))] ${dock ? "lg:pt-5" : ""}`}>{children}</div>
      </div>
    </div>,
    document.body,
  );
}
