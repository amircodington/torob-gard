import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "ترب‌گرد",
    short_name: "ترب‌گرد",
    description: "همراه خرید حضوری تو بازار الکترونیک مرکز تهران",
    start_url: "/",
    scope: "/",
    display: "standalone",
    dir: "rtl",
    lang: "fa",
    theme_color: "#fbf7f3",
    background_color: "#fbf7f3",
    icons: [
      { src: "/icons/icon-192.png", sizes: "192x192", type: "image/png", purpose: "any" },
      { src: "/icons/icon-512.png", sizes: "512x512", type: "image/png", purpose: "any" },
      { src: "/icons/maskable-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
  };
}
