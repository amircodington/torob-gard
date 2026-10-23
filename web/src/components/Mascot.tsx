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
// ponytail: float never pauses offscreen; it is a CSS translate on the compositor (no JS, no layout), used by the hero only. Add an IO pause if more mascots float.
const CSS_REACT = { float: "animate-float", pop: "animate-pop" };
type Reaction = keyof typeof GSAP_REACT | keyof typeof CSS_REACT;

/** One `animation` per element, so pop + float is its own token (pop, then the bob). */
export function cssReact(react: Reaction | Reaction[] | undefined): string {
  const r = ([] as (Reaction | undefined)[]).concat(react);
  if (r.includes("pop") && r.includes("float")) return "animate-pop-float";
  return r.map((x) => (x && x in CSS_REACT ? CSS_REACT[x as keyof typeof CSS_REACT] : "")).join(" ").trim();
}

export function Mascot({
  pose,
  className = "",
  alt,
  react,
  loading,
}: {
  pose: MascotPose;
  /** Sizes and places the image (e.g. "size-36"); the art is square. */
  className?: string;
  alt?: string;
  /** One react, or several (e.g. ["pop", "float", "wave"]); at most one GSAP react plays. */
  react?: Reaction | Reaction[];
  /** "lazy" below the fold (Global Constraint). */
  loading?: "lazy" | "eager";
}) {
  const ref = useRef<HTMLImageElement>(null);
  const gsapReact = ([] as (Reaction | undefined)[]).concat(react).find((r) => r && r in GSAP_REACT) as keyof typeof GSAP_REACT | undefined;
  useLayoutEffect(() => {
    if (!gsapReact) return;
    const mm = gsap.matchMedia();
    mm.add("(prefers-reduced-motion: no-preference)", () => {
      GSAP_REACT[gsapReact](ref.current!);
    });
    return () => mm.revert();
  }, [gsapReact]);

  const css = cssReact(react);
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
      loading={loading}
      draggable={false}
      className={`shrink-0 object-contain ${css} ${className}`}
    />
  );
}
