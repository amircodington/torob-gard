import { existsSync } from "node:fs";
import { expect, it } from "vitest";
import { MASCOT_POSES, mascotSrc } from "./Mascot";

it("every pose maps to a file in public/mascot", () => {
  expect(MASCOT_POSES).toEqual(["wave", "idle", "think", "point", "search", "stuck", "celebrate", "bags", "phone", "walk", "check", "icon"]);
  for (const pose of MASCOT_POSES) expect(existsSync(`public${mascotSrc(pose)}`), pose).toBe(true);
});
