import type { MetadataRoute } from "next";
import { api } from "../lib/api";
import { pathOf, SITE_URL } from "../lib/seo";

// ISR: the lists change only on a data refresh. api.ts is no-store; force-cache lets the route cache.
export const revalidate = 3600;
export const fetchCache = "force-cache";

const abs = (path: string) => new URL(path, SITE_URL).toString();

const load = () => {
  process.env.API_URL ??= "http://localhost:8000"; // ponytail: as in lib/server.ts; set API_URL in prod.
  return api.sitemap();
};

/** id 0: landing, about, pasazhs, desk categories, shops. id n ≥ 1: products with ≥ 2 offers, 10k a chunk. */
export async function generateSitemaps() {
  // ponytail: API down at build → only chunk 0; the next revalidation adds the product chunks.
  const pages = await load().then((s) => s.productPages, () => 0);
  return Array.from({ length: pages + 1 }, (_, id) => ({ id }));
}

export default async function sitemap(props: { id: Promise<string> }): Promise<MetadataRoute.Sitemap> {
  const id = Number(await props.id);
  if (id > 0) return (await api.sitemapProducts(id - 1)).map((p) => ({ url: abs(pathOf.product(p)) }));
  const s = await load();
  return [
    "/", "/about",
    ...s.venues.map(pathOf.venue), ...s.categories.map(pathOf.category), ...s.shops.map(pathOf.shop),
  ].map((path) => ({ url: abs(path) }));
}
