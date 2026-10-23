import type { MetadataRoute } from "next";
import { connection } from "next/server";
import { api } from "../lib/api";
import { pathOf, SITE_URL } from "../lib/seo";

// ISR: the lists change only on a data refresh. api.ts is no-store; force-cache lets the route cache.
export const revalidate = 3600;
export const fetchCache = "force-cache";

// ponytail: fixed ids, because the prod image builds without the API and generateSitemaps runs only at
// build. 10 product chunks × 10k = 100k products with ≥ 2 offers (33,210 today); raise it past that.
export const PRODUCT_CHUNKS = 10;
export const SITEMAP_IDS = Array.from({ length: PRODUCT_CHUNKS + 1 }, (_, id) => id);

const abs = (path: string) => new URL(path, SITE_URL).toString();
// A failed fetch while `next build` prerenders this route hangs the build (web/Dockerfile has no API).
const building = () => process.env.NEXT_PHASE === "phase-production-build";

/** id 0: landing, about, pasazhs, desk categories, shops. id n ≥ 1: products with ≥ 2 offers, 10k a chunk. */
export async function generateSitemaps() {
  return SITEMAP_IDS.map((id) => ({ id }));
}

export default async function sitemap(props: { id: Promise<string> }): Promise<MetadataRoute.Sitemap> {
  const id = Number(await props.id);
  process.env.API_URL ??= "http://localhost:8000"; // ponytail: as in lib/server.ts; set API_URL in prod.
  // At build: render on request instead (a build-time stub would be cached for an hour after every
  // deploy). At runtime the API's answers are cached an hour (fetchCache); a failure throws, never a stub.
  if (building()) await connection();
  if (id > 0) return (await api.sitemapProducts(id - 1)).map((p) => ({ url: abs(pathOf.product(p)) })); // past the end: []
  const s = await api.sitemap();
  return [
    "/", "/about",
    ...s.venues.map(pathOf.venue), ...s.categories.map(pathOf.category), ...s.shops.map(pathOf.shop),
  ].map((path) => ({ url: abs(path) }));
}
