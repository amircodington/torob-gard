import { expect, it } from "vitest";
import { dismiss, project, rubber } from "./gesture";

it("projects momentum", () => {
  expect(project(0)).toBe(0);
  expect(project(1)).toBeCloseTo(99);
});

it("rubber-bands past the edge", () => {
  expect(rubber(100, 800)).toBeLessThan(100);
  expect(rubber(-100, 800)).toBeGreaterThan(-100);
});

it("dismisses on a flick or a long drag, not a short slow one", () => {
  expect(dismiss(50, 1.2, 600)).toBe(true);
  expect(dismiss(150, 0, 600)).toBe(false);
  expect(dismiss(250, 0, 600)).toBe(true);
  expect(dismiss(300, -1, 600)).toBe(false); // flicked back up
});
