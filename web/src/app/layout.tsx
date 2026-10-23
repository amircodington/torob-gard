import type { Metadata, Viewport } from "next";
import { Footer } from "../components/landing/Footer";
import { RegisterSW } from "../components/RegisterSW";
import { SITE_URL } from "../lib/seo";
import "./globals.css";

const DESCRIPTION = "همراه خرید حضوری تو بازار الکترونیک مرکز تهران: مدل مناسب رو با دلیل انتخاب کن و بدون از کدوم مغازه و کدوم طبقه بخری.";

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: { default: "ترب‌گرد | از چی بخرم تا از کجا بخرم!", template: "%s | ترب‌گرد" },
  description: DESCRIPTION,
  openGraph: { title: "ترب‌گرد | از چی بخرم تا از کجا بخرم!", description: DESCRIPTION, locale: "fa_IR", type: "website" },
  icons: { icon: "/mascot/torob-gard-icon.webp", apple: "/icons/icon-192.png" },
};

// viewport-fit=cover lets the sheets' env(safe-area-inset-*) padding work; theme-color = paper.
export const viewport: Viewport = { width: "device-width", initialScale: 1, viewportFit: "cover", themeColor: "#fbf7f3" };

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    // suppressHydrationWarning: the service worker adds data-offline to a saved copy.
    <html lang="fa" dir="rtl" className="h-full antialiased" suppressHydrationWarning>
      <body className="min-h-full">
        <p data-testid="offline-note" role="status" className="offline-note bg-ink py-1.5 text-center text-[13px] font-bold text-on-dark">
          آفلاین — آخرین نسخه‌ی ذخیره‌شده
        </p>
        {children}
        <Footer />
        <RegisterSW />
      </body>
    </html>
  );
}
