import { existsSync } from "node:fs";
import { expect, it } from "vitest";
import { MASCOT_POSES, cssReact, mascotSrc } from "./Mascot";

it("every pose maps to a file in public/mascot", () => {
  expect(MASCOT_POSES).toEqual(["wave", "idle", "think", "point", "search", "stuck", "celebrate", "bags", "phone", "walk", "check", "icon"]);
  for (const pose of MASCOT_POSES) expect(existsSync(`public${mascotSrc(pose)}`), pose).toBe(true);
});

it("float combines with the pop entrance; GSAP reacts add no class", () => {
  expect(cssReact(undefined)).toBe("");
  expect(cssReact("float")).toBe("animate-float");
  expect(cssReact("pop")).toBe("animate-pop");
  expect(cssReact(["pop", "float"])).toBe("animate-pop-float");
  expect(cssReact(["pop", "float", "wave"])).toBe("animate-pop-float");
  expect(cssReact("hop")).toBe("");
});
