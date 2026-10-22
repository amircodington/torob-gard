import { readFileSync } from "node:fs";
import { expect, it } from "vitest";
import { gsap } from "gsap";
import { DUR, registerMotion, STAGGER } from "./motion";

// The CSS tokens and the GSAP mirror never drift.
const css = readFileSync("src/app/globals.css", "utf8");

it("easings match", () => {
  expect(css).toMatch(/--ease-out:\s*cubic-bezier\(0\.23, 1, 0\.32, 1\)/);
  expect(css).toMatch(/--ease-in-out:\s*cubic-bezier\(0\.77, 0, 0\.175, 1\)/);
  expect(css).toMatch(/--ease-drawer:\s*cubic-bezier\(0\.32, 0\.72, 0, 1\)/);
});

it("durations match DUR", () => {
  expect(Object.keys(DUR)).toEqual(["press", "fast", "base", "sheet", "slow"]);
  for (const [k, s] of Object.entries(DUR)) expect(css).toContain(`--duration-${k}: ${Math.round(s * 1000)}ms`);
  expect(css).toContain(`--stagger: ${STAGGER * 1000}ms`);
});

it("registers the brand curves once", () => {
  registerMotion();
  registerMotion();
  for (const name of ["tg.out", "tg.inOut", "tg.drawer"]) expect(gsap.parseEase(name)(0.5)).toBeGreaterThan(0);
});
