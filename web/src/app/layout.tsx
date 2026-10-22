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
      <body className="min-h-full">{children}</body>
    </html>
  );
}
