"use client";

import { useLayoutEffect, useRef } from "react";
import { gsap } from "gsap";

/** The 3D radish set (decision 13): transparent 640×640 WebPs, the character standing on the bottom edge. */
export const MASCOT_POSES = ["wave", "idle", "think", "point", "search", "stuck", "celebrate", "bags", "phone", "walk", "check", "icon"] as const;
export type MascotPose = (typeof MASCOT_POSES)[number];

export const mascotSrc = (pose: MascotPose) =>
  pose === "icon" ? "/mascot/torob-gard-icon.webp" : `/mascot/torob-gard-mascot-${pose}.webp`;

/** Once per mount (motion table): hop for point, shake for stuck, wave after the hero entrance. Reduced motion: none. */
const GSAP_REACT = {
  hop: (el: Element) => gsap.from(el, { y: 12, rotation: -4, duration: 0.42, ease: "back.out(1.6)", transformOrigin: "50% 100%" }),
  shake: (el: Element) => gsap.to(el, { keyframes: { x: [0, 4, -4, 4, -4, 0] }, duration: 0.3, ease: "none" }),
  // The hero: its CSS rise (600 ms) runs from the server paint, then one wave.
  wave: (el: Element) => gsap.to(el, { keyframes: { rotation: [0, 6, -6, 6, -6, 0] }, duration: 0.6, delay: 0.6, ease: "none", transformOrigin: "50% 100%" }),
};
/** CSS, from the server paint (globals.css): a slow idle bob, and a pop-in entrance. Reduced motion: none / fade. */
const CSS_REACT = { float: "animate-float", pop: "animate-pop" };

export function Mascot({
  pose,
  className = "",
  alt,
  react,
}: {
  pose: MascotPose;
  /** Sizes and places the image (e.g. "size-36"); the art is square. */
  className?: string;
  alt?: string;
  react?: keyof typeof GSAP_REACT | keyof typeof CSS_REACT;
}) {
  const ref = useRef<HTMLImageElement>(null);
  useLayoutEffect(() => {
    if (!react || !(react in GSAP_REACT)) return;
    const mm = gsap.matchMedia();
    mm.add("(prefers-reduced-motion: no-preference)", () => {
      GSAP_REACT[react as keyof typeof GSAP_REACT](ref.current!);
    });
    return () => mm.revert();
  }, [react]);

  const css = react && react in CSS_REACT ? CSS_REACT[react as keyof typeof CSS_REACT] : "";
  return (
    // ponytail: plain <img> skips the next/image optimizer; the WebPs are already 640px and small.
    // eslint-disable-next-line @next/next/no-img-element
    <img
      ref={ref}
      src={mascotSrc(pose)}
      alt={alt ?? ""}
      aria-hidden={alt ? undefined : true}
      width={640}
      height={640}
      draggable={false}
      className={`shrink-0 object-contain ${css} ${className}`}
    />
  );
}
