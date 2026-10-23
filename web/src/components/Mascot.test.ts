import { existsSync } from "node:fs";
import { expect, it } from "vitest";
import { MASCOT_POSES, cssReact, mascotSizes, mascotSmall, mascotSrc } from "./Mascot";

it("every pose maps to a file in public/mascot, plus its small variant", () => {
  expect(MASCOT_POSES).toEqual(["wave", "idle", "think", "point", "search", "stuck", "celebrate", "bags", "phone", "walk", "check", "icon"]);
  for (const pose of MASCOT_POSES) {
    expect(existsSync(`public${mascotSrc(pose)}`), pose).toBe(true);
    expect(existsSync(`public${mascotSmall(pose).src}`), `${pose} small`).toBe(true);
  }
  expect(mascotSmall("icon")).toEqual({ src: "/mascot/torob-gard-icon-96.webp", w: 96 });
  expect(mascotSmall("walk")).toEqual({ src: "/mascot/torob-gard-mascot-walk-320.webp", w: 320 });
});

it("sizes follow the size-N classes per breakpoint, widest first", () => {
  expect(mascotSizes("size-12")).toBe("48px");
  expect(mascotSizes("-my-2 size-12")).toBe("48px");
  expect(mascotSizes("absolute -top-6 end-2 size-28 lg:end-[50%] lg:size-56")).toBe("(min-width: 1024px) 224px, 112px");
  expect(mascotSizes("-mb-6 ms-auto size-16 min-[360px]:size-20 lg:-mb-8 lg:size-32")).toBe("(min-width: 1024px) 128px, (min-width: 360px) 80px, 64px");
  expect(mascotSizes("size-36 md:order-last md:size-44")).toBe("(min-width: 768px) 176px, 144px");
  expect(mascotSizes("size-full")).toBeUndefined(); // no size: no srcset, the 640 file
});

it("float combines with the pop entrance; GSAP reacts add no class", () => {
  expect(cssReact(undefined)).toBe("");
  expect(cssReact("float")).toBe("animate-float");
  expect(cssReact("pop")).toBe("animate-pop");
  expect(cssReact(["pop", "float"])).toBe("animate-pop-float");
  expect(cssReact(["pop", "float", "wave"])).toBe("animate-pop-float");
  expect(cssReact("hop")).toBe("");
});
