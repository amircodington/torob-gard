import type { MetadataRoute } from "next";
import { SITE_URL } from "../lib/seo";
import { SITEMAP_IDS } from "./sitemap";

// Journey pages are per-person and the APIs are not content; the catalog pages are the public face.
export default function robots(): MetadataRoute.Robots {
  return {
    rules: { userAgent: "*", allow: "/", disallow: ["/api/", "/agent/", "/trip/", "/radar/"] },
    sitemap: SITEMAP_IDS.map((id) => `${SITE_URL}/sitemap/${id}.xml`),
  };
}
