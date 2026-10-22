import type { Metadata } from "next";
import { SiteHeader } from "../../components/SiteHeader";

export const metadata: Metadata = { title: "حریم خصوصی" };

const CARD = "rounded-lg bg-surface p-5 shadow-card text-[15px] leading-6";

export default function Privacy() {
  return (
    <>
      <SiteHeader />
      <main className="page flex flex-col gap-3 pt-8 pb-12">
        <h1 className="mb-3 text-[34px] leading-[48px] font-light">
          حریم <span className="font-extrabold">خصوصی</span>
        </h1>
        <section className={CARD}>
          <h2 className="font-extrabold">چی نگه می‌داریم</h2>
          <ul className="mt-1 list-disc ps-5 text-ink-muted">
            <li>نیازها و انتخاب‌هات تا قبل از حرکت فقط تو مرورگر خودت می‌مونه.</li>
            <li>
              وقتی «برو همین‌جا» رو می‌زنی، سفر خریدت (نیازها، مدل و فروشگاه انتخابی، فروشگاه‌هایی که نشد، و نقطه‌ی شروعی که از فهرست انتخاب کردی — هیچ‌وقت موقعیت خودت) روی سرور ذخیره می‌شه تا بتونی لینکش رو بفرستی.
            </li>
            <li>هر کسی که لینک سفر رو داشته باشه می‌تونه ببینه و تغییرش بده؛ فعلاً قفلی روش نیست.</li>
            <li>گزارش‌هایی که درباره‌ی مغازه‌ها می‌دی (باز بود، جنس داشت، جواب نداد).</li>
          </ul>
        </section>
        <section className={CARD}>
          <h2 className="font-extrabold">چی نگه نمی‌داریم</h2>
          <ul className="mt-1 list-disc ps-5 text-ink-muted">
            <li>تاریخچه‌ی موقعیتت. «موقعیت من» یه بار برای مرتب‌کردن مغازه‌ها استفاده می‌شه و هیچ‌جا ذخیره نمی‌شه.</li>
            <li>حساب کاربری نداریم؛ اسم و ایمیلت رو نمی‌خوایم.</li>
          </ul>
        </section>
      </main>
    </>
  );
}
