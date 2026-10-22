import type { Metadata } from "next";
import { Footer } from "../components/landing/Footer";
import "./globals.css";

const DESCRIPTION = "همراه خرید حضوری تو بازار الکترونیک مرکز تهران: مدل مناسب رو با دلیل انتخاب کن و بدون از کدوم مغازه و کدوم طبقه بخری.";

export const metadata: Metadata = {
  title: { default: "ترب‌گرد | از چی بخرم تا از کجا بخرم!", template: "%s | ترب‌گرد" },
  description: DESCRIPTION,
  openGraph: { title: "ترب‌گرد | از چی بخرم تا از کجا بخرم!", description: DESCRIPTION, locale: "fa_IR", type: "website" },
  icons: "/mascot/torob-gard-icon.webp",
};

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
