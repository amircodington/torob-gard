const QA = [
  { q: "ترب‌گرد چیه؟", a: "یه همراه برای خرید حضوری تو بازار الکترونیک مرکز تهران: کمک می‌کنه مدل رو انتخاب کنی و بدونی از کدوم مغازه، کدوم طبقه بخری." },
  { q: "قیمت‌ها از کجا میاد؟", a: "از داده‌ی ترب/استارکوچ. کنار هر قیمت تاریخش هست؛ قیمت قدیمی رو قدیمی نشون می‌دیم." },
  { q: "از کجا بدونم مغازه جنس رو داره؟", a: "نمی‌دونیم، مگه یه خریدار تازگی گزارش داده باشه. قبل از رفتن زنگ بزن." },
  { q: "باید ثبت‌نام کنم؟", a: "نه. همه‌چی بدون حساب کار می‌کنه." },
  { q: "موقعیتم ذخیره می‌شه؟", a: "نه. «موقعیت من» فقط یه بار برای مرتب‌کردن مغازه‌ها استفاده می‌شه و جایی نگه داشته نمی‌شه." },
];

export function Faq() {
  return (
    <section>
      <h2 className="text-[22px] leading-8 font-light">
        سوال‌های <span className="font-extrabold">پرتکرار</span>
      </h2>
      <div className="mt-4 flex flex-col gap-2">
        {QA.map(({ q, a }) => (
          <details key={q} className="group rounded-lg bg-surface shadow-card">
            <summary className="flex min-h-11 cursor-pointer list-none items-center justify-between gap-3 px-5 py-3 text-[15px] leading-6 font-bold [&::-webkit-details-marker]:hidden">
              {q}
              <span aria-hidden className="text-[17px] text-ink-muted transition-transform group-open:rotate-45">+</span>
            </summary>
            <p className="px-5 pb-4 text-[15px] leading-6 text-ink-muted">{a}</p>
          </details>
        ))}
      </div>
    </section>
  );
}
