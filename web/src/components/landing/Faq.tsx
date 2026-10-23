import { ChevronDown, MessageCircleQuestion } from "lucide-react";
import { SectionHead } from "./SectionHead";

const QA = [
  { q: "ترب‌گرد چیه؟", a: "یه همراه برای خرید حضوری تو بازار الکترونیک مرکز تهران: کمک می‌کنه مدل رو انتخاب کنی و بدونی از کدوم مغازه، کدوم طبقه بخری." },
  { q: "قیمت‌ها از کجا میاد؟", a: "از داده‌ی ترب/استارکوچ. کنار هر قیمت تاریخش هست؛ قیمت قدیمی رو قدیمی نشون می‌دیم." },
  { q: "از کجا بدونم مغازه جنس رو داره؟", a: "نمی‌دونیم، مگه یه خریدار تازگی گزارش داده باشه. قبل از رفتن زنگ بزن." },
  { q: "باید ثبت‌نام کنم؟", a: "نه. همه‌چی بدون حساب کار می‌کنه." },
  { q: "موقعیتم ذخیره می‌شه؟", a: "نه. «موقعیت من» فقط یه بار برای مرتب‌کردن مغازه‌ها استفاده می‌شه و جایی نگه داشته نمی‌شه." },
];

export function Faq() {
  return (
    <section className="band bg-surface">
      <div className="page">
        <SectionHead icon={MessageCircleQuestion} mascot="think" title={<>سوال‌های <span className="font-extrabold">پرتکرار</span></>} sub="جواب کوتاه، بدون تعارف." />
        <div data-reveal className="mt-6 grid gap-2 lg:mt-8 lg:grid-cols-2 lg:items-start lg:gap-3">
          {QA.map(({ q, a }) => (
            <details key={q} className="group rounded-lg bg-surface-tint">
              <summary className="flex min-h-13 cursor-pointer list-none items-center justify-between gap-3 px-5 py-3 text-[15px] leading-6 font-bold [&::-webkit-details-marker]:hidden">
                {q}
                <ChevronDown aria-hidden className="size-5 shrink-0 text-ink-muted transition-transform duration-(--duration-fast) ease-out group-open:rotate-180 motion-reduce:transition-none in-data-[input=keyboard]:transition-none" />
              </summary>
              <p className="px-5 pb-4 text-[15px] leading-6 text-ink-muted">{a}</p>
            </details>
          ))}
        </div>
      </div>
    </section>
  );
}
