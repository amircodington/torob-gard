"use client";

import { useLayoutEffect, useRef, type RefObject } from "react";
import { gsap } from "gsap";

export type MascotPose = "wave" | "idle" | "point" | "stuck" | "icon";

/** Once per mount (motion table): hop for point, shake for stuck, wave after the hero entrance. Reduced motion: none. */
const REACT = {
  hop: (el: Element) => gsap.from(el, { y: 12, rotation: -4, duration: 0.42, ease: "back.out(1.6)" }),
  shake: (el: Element) => gsap.to(el, { keyframes: { x: [0, 4, -4, 4, -4, 0] }, duration: 0.3, ease: "none" }),
  // The hero: its CSS rise (600 ms) runs from the server paint, then one wave.
  wave: (el: Element) => gsap.to(el, { keyframes: { rotation: [0, 6, -6, 6, -6, 0] }, duration: 0.6, delay: 0.6, ease: "none", transformOrigin: "50% 100%" }),
};

export function Mascot({
  pose,
  className = "",
  alt,
  framed = pose !== "icon",
  react,
}: {
  pose: MascotPose;
  /** Framed: sizes the tint circle (e.g. "size-36"). Unframed: styles the image. */
  className?: string;
  alt?: string;
  framed?: boolean;
  react?: keyof typeof REACT;
}) {
  const ref = useRef<HTMLElement>(null);
  useLayoutEffect(() => {
    if (!react) return;
    const mm = gsap.matchMedia();
    mm.add("(prefers-reduced-motion: no-preference)", () => {
      REACT[react](ref.current!);
    });
    return () => mm.revert();
  }, [react]);

  const icon = pose === "icon";
  const img = (
    // ponytail: plain <img> skips the next/image optimizer; the WebPs are already 512px wide and ≤ 60 KB.
    // eslint-disable-next-line @next/next/no-img-element
    <img
      ref={framed ? undefined : (ref as RefObject<HTMLImageElement | null>)}
      src={icon ? "/mascot/torob-gard-icon.webp" : `/mascot/torob-gard-mascot-${pose}.webp`}
      alt={alt ?? ""}
      aria-hidden={alt ? undefined : true}
      width={512}
      height={icon ? 512 : 768}
      draggable={false}
      // multiply melts the WebP's grey backdrop into the tint circle
      className={framed ? "size-full object-cover object-[50%_45%] mix-blend-multiply" : className}
    />
  );
  if (!framed) return img;
  return (
    <span ref={ref} className={`isolate block shrink-0 overflow-hidden rounded-full bg-surface-tint ${className}`}>
      {img}
    </span>
  );
}
