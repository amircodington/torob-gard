import type { Metadata } from "next";
import { SiteHeader } from "../../components/SiteHeader";
import { MePage } from "../../components/me/MePage";

export const metadata: Metadata = { title: "صفحه‌ی من", robots: { index: false } };

export default function Me() {
  return (
    <>
      <SiteHeader />
      <main className="page flex flex-col gap-3 pt-8 pb-12">
        <MePage />
      </main>
    </>
  );
}
