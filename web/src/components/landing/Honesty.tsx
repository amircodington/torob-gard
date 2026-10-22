// The six honesty rules of PLAN §2, in plain words.
const RULES = [
  "هر قیمت تاریخ داره؛ اگه بیشتر از ۶۰ روز گذشته باشه، می‌گیم شاید عوض شده.",
  "«موجود» نمی‌گیم، مگه یه خریدار تو ۴۸ ساعت گذشته گزارشش رو داده باشه.",
  "چیزی که ثبت نشده رو می‌گیم ثبت نشده؛ حدس نمی‌زنیم.",
  "طبقه و واحدی که ازش مطمئن نیستیم، با «احتمالاً» میاد.",
  "قیمت‌های پرت و عجیب رو اصلاً نشون نمی‌دیم.",
  "ترب‌گرد پروژه‌ی چالش ترب/استارکوچه، نه محصول رسمی ترب.",
];

export function Honesty() {
  return (
    <section className="rounded-lg bg-surface p-5 shadow-card">
      <h2 className="text-[22px] leading-8 font-light">
        قول‌های <span className="font-extrabold">ما</span>
      </h2>
      <ul className="mt-3 flex flex-col gap-2">
        {RULES.map((r) => (
          <li key={r} className="flex gap-2 text-[15px] leading-6">
            <span aria-hidden className="mt-2.5 size-1.5 shrink-0 rounded-full bg-ink" />
            {r}
          </li>
        ))}
      </ul>
    </section>
  );
}
