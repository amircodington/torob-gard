import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "ترب‌گرد",
  description: "از چی بخرم تا از کجا بخرم!",
  icons: "/mascot/torob-gard-icon.webp",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="fa" dir="rtl" className="h-full antialiased">
      <body className="min-h-full">
        {children}
        <footer className="mx-auto max-w-md px-4 pb-6 pt-2 text-center text-[11px] font-semibold leading-5 text-ink-muted">
          ترب‌گرد — پروژه‌ی چالش ترب/استارکوچ؛ محصول رسمی ترب نیست.
        </footer>
      </body>
    </html>
  );
}
