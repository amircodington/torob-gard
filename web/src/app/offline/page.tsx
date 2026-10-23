import Link from "next/link";
import { Mascot } from "../../components/Mascot";
import { SiteHeader } from "../../components/SiteHeader";

export const metadata = { title: "آفلاین", robots: { index: false } };

/** What the service worker shows for a page it has not saved. */
export default function Offline() {
  return (
    <>
      <SiteHeader />
      <main className="page flex flex-col items-center pt-8 pb-12 text-center">
        <Mascot pose="stuck" react="shake" className="size-44" />
        <h1 className="mt-8 text-[28px] leading-10 font-light">
          الان <span className="font-extrabold">آفلاینی</span>
        </h1>
        <p className="mt-3 max-w-80 text-[15px] leading-7 text-ink-muted">
          این صفحه ذخیره نشده. چک‌لیست و مسیر سه سفر آخری که باز کردی بدون اینترنت هم باز می‌شن.
        </p>
        <Link href="/" className="mt-8 inline-flex min-h-11 items-center rounded-pill bg-orange px-6 text-[15px] font-bold text-on-orange shadow-card lift press">
          برگشت به خانه
        </Link>
      </main>
    </>
  );
}
