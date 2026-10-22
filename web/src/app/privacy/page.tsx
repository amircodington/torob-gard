import type { Metadata } from "next";

export const metadata: Metadata = { title: "حریم خصوصی" };

const CARD = "rounded-lg bg-surface p-5 shadow-card text-[15px] leading-6";

export default function Privacy() {
  return (
    <main className="mx-auto flex max-w-md flex-col gap-3 px-4 pt-16 pb-12">
      <h1 className="mb-3 text-[34px] leading-[48px] font-light">
        حریم <span className="font-extrabold">خصوصی</span>
      </h1>
      <section className={CARD}>
        <h2 className="font-extrabold">چی نگه می‌داریم</h2>
        <ul className="mt-1 list-disc ps-5 text-ink-muted">
          <li>مسیر خریدت (نیازها و انتخاب‌ها) فقط تو مرورگر خودت ذخیره می‌شه.</li>
          <li>گزارش‌هایی که درباره‌ی مغازه‌ها می‌دی (باز بود، جنس داشت، جواب نداد).</li>
          <li>سفرهای خریدی که ثبت می‌کنی، تا لینکش رو داشته باشی.</li>
          <li>شماره‌ی موبایل، فقط اگه خودت بخوای (بعداً اضافه می‌شه).</li>
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
  );
}
