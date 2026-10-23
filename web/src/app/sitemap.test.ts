import { afterEach, describe, expect, it, vi } from "vitest";

const api = vi.hoisted(() => ({ sitemap: vi.fn(), sitemapProducts: vi.fn() }));
vi.mock("../lib/api", () => ({ api }));
const connection = vi.hoisted(() => vi.fn());
vi.mock("next/server", () => ({ connection }));

import robots from "./robots";
import sitemap, { generateSitemaps } from "./sitemap";

const chunk = (id: number) => sitemap({ id: Promise.resolve(String(id)) });

afterEach(() => {
  vi.unstubAllEnvs();
  vi.resetAllMocks();
});

describe("sitemap", () => {
  it("has fixed chunk ids that robots advertises, with no API call", async () => {
    const ids = (await generateSitemaps()).map((s) => s.id);
    expect(ids[0]).toBe(0);
    expect(ids.length).toBeGreaterThan(4); // 33,210 products with ≥ 2 offers → 4 chunks today
    const advertised = (await robots()).sitemap as string[];
    expect(advertised.map((u) => Number(u.match(/sitemap\/(\d+)\.xml$/)![1]))).toEqual(ids);
    expect(api.sitemap).not.toHaveBeenCalled();
  });

  it("serves products in chunk n and [] past the real count", async () => {
    api.sitemapProducts.mockResolvedValueOnce(["p1"]).mockResolvedValueOnce([]);
    expect((await chunk(1)).map((e) => e.url)).toEqual([expect.stringMatching(/\/product\/p1$/)]);
    expect(await chunk(9)).toEqual([]);
    expect(api.sitemapProducts).toHaveBeenNthCalledWith(2, 8);
  });

  it("rethrows an API failure at runtime so ISR keeps the last good sitemap", async () => {
    api.sitemap.mockRejectedValue(new Error("down"));
    await expect(chunk(0)).rejects.toThrow("down");
  });

  it("opts out of prerendering while next build runs (the image has no API)", async () => {
    vi.stubEnv("NEXT_PHASE", "phase-production-build");
    connection.mockRejectedValue(new Error("dynamic"));
    await expect(chunk(0)).rejects.toThrow("dynamic");
    expect(api.sitemap).not.toHaveBeenCalled();
  });
});
