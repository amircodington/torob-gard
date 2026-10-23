"use client";

import { useEffect } from "react";
import { REDUCED } from "../../lib/motion";

/**
 * Adds .reveal-in to each [data-reveal] block the first time it scrolls into view (globals.css).
 * Blocks already on screen at load, reduced motion and no IntersectionObserver: nothing happens, content stays as painted.
 */
export function Reveal() {
  useEffect(() => {
    if (typeof IntersectionObserver === "undefined" || window.matchMedia(REDUCED).matches) return;
    const seen = new WeakSet<Element>();
    const io = new IntersectionObserver((entries) => {
      for (const { target, isIntersecting } of entries) {
        const atLoad = !seen.has(target);
        seen.add(target);
        if (!isIntersecting) continue;
        io.unobserve(target);
        if (atLoad) continue; // already painted on screen: animating it now would blink it
        Array.from(target.children).forEach((c, i) => (c as HTMLElement).style.setProperty("--i", String(i)));
        target.classList.add("reveal-in");
      }
    });
    document.querySelectorAll("[data-reveal]").forEach((el) => io.observe(el));
    return () => io.disconnect();
  }, []);
  return null;
}
