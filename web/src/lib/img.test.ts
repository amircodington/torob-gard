import { afterEach, expect, it, vi } from "vitest";
import { img } from "./img";

afterEach(() => vi.unstubAllEnvs());

it("swaps the Torob host for NEXT_PUBLIC_IMG_BASE", () => {
  const u = "https://image.torob.com/base/images/BQ/Zz/x.jpg";
  expect(img(u)).toBe(u);
  vi.stubEnv("NEXT_PUBLIC_IMG_BASE", "/img");
  expect(img(u)).toBe("/img/base/images/BQ/Zz/x.jpg");
  expect(img("https://other.example/x.jpg")).toBe("https://other.example/x.jpg");
});
