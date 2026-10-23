import type { Metadata, Viewport } from "next";
import { Footer } from "../components/landing/Footer";
import { SITE_URL } from "../lib/seo";
import "./globals.css";

const DESCRIPTION = "همراه خرید حضوری تو بازار الکترونیک مرکز تهران: مدل مناسب رو با دلیل انتخاب کن و بدون از کدوم مغازه و کدوم طبقه بخری.";

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: { default: "ترب‌گرد | از چی بخرم تا از کجا بخرم!", template: "%s | ترب‌گرد" },
  description: DESCRIPTION,
  openGraph: { title: "ترب‌گرد | از چی بخرم تا از کجا بخرم!", description: DESCRIPTION, locale: "fa_IR", type: "website" },
  icons: "/mascot/torob-gard-icon.webp",
};

// viewport-fit=cover lets the sheets' env(safe-area-inset-*) padding work; theme-color = paper.
export const viewport: Viewport = { width: "device-width", initialScale: 1, viewportFit: "cover", themeColor: "#fbf7f3" };

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="fa" dir="rtl" className="h-full antialiased">
      <body className="min-h-full">
        {children}
        <Footer />
      </body>
    </html>
  );
}
