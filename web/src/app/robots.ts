import type { MetadataRoute } from "next";
import { api } from "../lib/api";
import { SITE_URL } from "../lib/seo";

export const revalidate = 3600;
export const fetchCache = "force-cache";

// Journey pages are per-person and the APIs are not content; the catalog pages are the public face.
export default async function robots(): Promise<MetadataRoute.Robots> {
  process.env.API_URL ??= "http://localhost:8000"; // ponytail: as in lib/server.ts; set API_URL in prod.
  const pages = await api.sitemap().then((s) => s.productPages, () => 0);
  return {
    rules: { userAgent: "*", allow: "/", disallow: ["/api/", "/agent/", "/trip/", "/radar/", "/search"] },
    sitemap: Array.from({ length: pages + 1 }, (_, id) => `${SITE_URL}/sitemap/${id}.xml`),
  };
}
