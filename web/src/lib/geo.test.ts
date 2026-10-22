import { expect, it } from "vitest";
import { haversineM, LANDMARKS, project } from "./geo";

it("projects the bbox onto 0–100", () => {
  expect(project(35.694, 51.418)).toEqual({ x: 50, y: 50 });
  expect(project(35.75, 51.418)).toBeNull();
});

it("measures metres between landmarks", () => {
  const d = haversineM(LANDMARKS.saadi, LANDMARKS.baharestan);
  expect(d).toBeGreaterThan(1500);
  expect(d).toBeLessThan(1800);
});
