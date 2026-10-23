/* Metadata and JSON-LD for the public catalog pages (P3). Prices are Toman in the app, IRR (×10) in schema.org. */
import type { Metadata } from "next";
import { faNum, faPrice } from "./fa";
import { img } from "./img";
import type { CategoryPage, OfferRow, Product, ShopDetail, VenueDetail } from "./types";

// No domain yet; prod sets SITE_URL. The root layout's metadataBase uses it too.
export const SITE_URL = process.env.SITE_URL ?? "http://localhost:3100";
const OG_DEFAULT = "/opengraph-image.png";
const abs = (path: string) => new URL(path, SITE_URL).toString();
const ctx = { "@context": "https://schema.org" } as const;

export const pathOf = {
  venue: (slug: string) => `/pasazh/${encodeURIComponent(slug)}`,
  shop: (id: string) => `/shop/${encodeURIComponent(id)}`,
  product: (id: string) => `/product/${encodeURIComponent(id)}`,
  category: (slug: string) => `/c/${encodeURIComponent(slug)}`,
};

/** A script tag's body: «<» escaped so a shop name cannot close the tag. */
export const ldJson = (data: object) => JSON.stringify(data).replace(/</g, "\\u003c");

const postal = (street: string) => ({ "@type": "PostalAddress", streetAddress: street, addressLocality: "تهران", addressCountry: "IR" });
const geo = (lat: number | null, lng: number | null) => (lat != null && lng != null ? { geo: { "@type": "GeoCoordinates", latitude: lat, longitude: lng } } : {});

export function jsonLdVenue(v: VenueDetail) {
  return {
    ...ctx, "@type": "ShoppingCenter", name: v.name, url: abs(pathOf.venue(v.slug)),
    ...(v.address ? { address: postal(v.address) } : {}), ...geo(v.lat, v.lng),
  };
}

export function jsonLdShop(s: ShopDetail) {
  return {
    ...ctx, "@type": "Store", name: s.name, url: abs(pathOf.shop(s.id)), address: postal(s.address),
    ...geo(s.lat, s.lng), ...(s.contact ? { telephone: s.contact } : {}),
    ...(s.mall && s.venueSlug ? { containedInPlace: { "@type": "ShoppingCenter", name: s.mall, url: abs(pathOf.venue(s.venueSlug)) } } : {}),
  };
}

export function jsonLdProduct(p: Product, offers: OfferRow[]) {
  return {
    ...ctx, "@type": "Product", name: p.title, url: abs(pathOf.product(p.id)),
    ...(p.imageUrls[0] ? { image: abs(img(p.imageUrls[0])) } : {}),
    ...(p.brand ? { brand: { "@type": "Brand", name: p.brand } } : {}),
    offers: {
      "@type": "AggregateOffer", priceCurrency: "IRR", offerCount: offers.length || p.offerCount,
      ...(p.minPrice != null ? { lowPrice: p.minPrice * 10 } : {}),
      ...(p.maxPrice != null ? { highPrice: p.maxPrice * 10 } : {}),
    },
  };
}

type Entity =
  | { kind: "venue"; e: VenueDetail }
  | { kind: "shop"; e: ShopDetail }
  | { kind: "product"; e: Product }
  | { kind: "category"; e: CategoryPage };

function parts({ kind, e }: Entity): { title: string; description: string; path: string; image?: string } {
  switch (kind) {
    case "venue": {
      const shops = e.floors.reduce((n, f) => n + f.shops.length, 0);
      return {
        title: `مغازه‌های ${faNum(e.name)}`,
        description: `${faNum(shops)} فروشگاه ${faNum(e.name)} به تفکیک طبقه، با پرفروش‌ترین دسته‌ها؛ قبل از رفتن ببین کدوم مغازه کدوم طبقه‌ست.`,
        path: pathOf.venue(e.slug),
      };
    }
    case "shop":
      return {
        title: `${e.name}${e.mall ? ` · ${faNum(e.mall)}` : ""}`,
        description: `${e.name}: آدرس، طبقه و واحد، ساعت کاری، تماس و قیمت‌های ثبت‌شده در ترب.`,
        path: pathOf.shop(e.id),
      };
    case "product":
      return {
        title: e.title,
        description: e.minPrice != null
          ? `${e.title}: از ${faPrice(e.minPrice)} در ${faNum(e.offerCount)} فروشگاه بازار الکترونیک مرکز تهران؛ قیمت‌ها با تاریخ ثبت.`
          : `${e.title}: فروشگاه‌های بازار الکترونیک مرکز تهران؛ قیمتی ثبت نشده.`,
        path: pathOf.product(e.id),
        image: e.imageUrls[0] && img(e.imageUrls[0]),
      };
    case "category":
      return {
        title: `${e.name} در بازار الکترونیک تهران`,
        description: `${e.name}: بازه‌ی قیمت، پاساژهای پرفروشگاه و مدل‌های پرطرفدار در مرکز تهران.`,
        path: pathOf.category(e.slug),
      };
  }
}

/** Persian title and description, canonical URL and OG card for one catalog page. */
export function metaFor<K extends Entity["kind"]>(kind: K, entity: Extract<Entity, { kind: K }>["e"]): Metadata {
  const { title, description, path, image } = parts({ kind, e: entity } as Entity);
  return {
    title, description,
    alternates: { canonical: path },
    openGraph: { title, description, url: path, locale: "fa_IR", type: "website", images: [image || OG_DEFAULT] },
  };
}
