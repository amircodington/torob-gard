import type { Metadata } from "next";
import { faGroup } from "../../lib/fa";

export const metadata: Metadata = { title: "درباره" };

const CARD = "rounded-lg bg-surface p-5 shadow-card text-[15px] leading-6";

export default function About() {
  return (
    <main className="mx-auto flex max-w-md flex-col gap-3 px-4 pt-16 pb-12">
      <h1 className="mb-3 text-[34px] leading-[48px] font-light">
        درباره‌ی <span className="font-extrabold">ترب‌گرد</span>
      </h1>
      <section className={CARD}>
        <h2 className="font-extrabold">چالش</h2>
        <p className="mt-1 text-ink-muted">
          ترب‌گرد برای چالش ترب/استارکوچ ساخته شده: یه همراه فارسی و موبایلی برای خرید حضوری تو بازار الکترونیک مرکز تهران، از انتخاب مدل تا پیدا کردن مغازه و طبقه‌ش.
        </p>
      </section>
      <section className={CARD}>
        <h2 className="font-extrabold">تیم</h2>
        <p className="mt-1 text-ink-muted">محمد و دو دانشجو.</p>
      </section>
      <section className={CARD}>
        <h2 className="font-extrabold">داده</h2>
        <p className="mt-1 text-ink-muted">
          دیتاست استارکوچ (نسخه‌ی ۱۶): {faGroup(6476)} فروشگاه · {faGroup(225903)} محصول · {faGroup(315665)} پیشنهاد قیمت. کنار هر قیمت تاریخ ثبتش هست.
        </p>
        <p className="mt-2 text-ink-muted">سفری که با «برو همین‌جا» می‌سازی روی سرور ذخیره می‌شه و هر کسی لینکش رو داشته باشه می‌تونه ببینه و تغییرش بده.</p>
      </section>
      <section className={CARD}>
        <h2 className="font-extrabold">تماس</h2>
        <p className="mt-1 text-ink-muted">از طریق ترب/استارکوچ.</p>
      </section>
    </main>
  );
}
