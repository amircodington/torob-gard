"use client";

import { useLayoutEffect, useRef } from "react";
import { gsap } from "gsap";
import { faGroup } from "../../lib/fa";
import { registerMotion } from "../../lib/motion";

/**
 * The final number is in the server HTML and the first client render (honest without JS).
 * When scrolled into view, it counts 0→value in 900 ms tg.out; reduced motion keeps the final number.
 */
export function CountUp({ value, format = faGroup }: { value: number; format?: (n: number) => string }) {
  const ref = useRef<HTMLSpanElement>(null);
  useLayoutEffect(() => {
    const el = ref.current!;
    const mm = gsap.matchMedia();
    mm.add("(prefers-reduced-motion: no-preference)", () => {
      if (typeof IntersectionObserver === "undefined") return;
      registerMotion();
      // Write the text node React owns, so a later render still finds it.
      const text = el.firstChild as Text;
      const p = { v: 0 };
      let tween: gsap.core.Tween | undefined;
      let first = true;
      const io = new IntersectionObserver(([e]) => {
        const atLoad = first;
        first = false;
        if (!e.isIntersecting) return;
        io.disconnect();
        if (atLoad) return; // already on screen at load: the final number was painted, don't drop it to 0
        tween = gsap.to(p, { v: value, duration: 0.9, ease: "tg.out", onUpdate: () => void (text.nodeValue = format(Math.round(p.v))) });
      });
      io.observe(el);
      return () => {
        io.disconnect();
        tween?.kill();
        text.nodeValue = format(value);
      };
    });
    return () => mm.revert();
  }, [value, format]);
  return <span ref={ref}>{format(value)}</span>;
}
