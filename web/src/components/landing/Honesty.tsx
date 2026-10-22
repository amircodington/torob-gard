import { CalendarClock, CircleDashed, CircleHelp, Filter, Info, PackageSearch } from "lucide-react";

// The six honesty rules of PLAN §2, in plain words.
const RULES = [
  { r: "هر قیمت تاریخ داره؛ اگه بیشتر از ۶۰ روز گذشته باشه، می‌گیم شاید عوض شده.", icon: CalendarClock },
  { r: "«موجود» نمی‌گیم، مگه یه خریدار تو ۴۸ ساعت گذشته گزارشش رو داده باشه.", icon: PackageSearch },
  { r: "چیزی که ثبت نشده رو می‌گیم ثبت نشده؛ حدس نمی‌زنیم.", icon: CircleDashed },
  { r: "طبقه و واحدی که ازش مطمئن نیستیم، با «احتمالاً» میاد.", icon: CircleHelp },
  { r: "قیمت‌های پرت و عجیب رو اصلاً نشون نمی‌دیم.", icon: Filter },
  { r: "ترب‌گرد پروژه‌ی چالش ترب/استارکوچه، نه محصول رسمی ترب.", icon: Info },
];

export function Honesty() {
  return (
    <section className="rounded-lg bg-surface p-5 shadow-card">
      <h2 className="text-[22px] leading-8 font-light">
        قول‌های <span className="font-extrabold">ما</span>
      </h2>
      <ul className="mt-3 flex flex-col gap-3">
        {RULES.map(({ r, icon: Icon }) => (
          <li key={r} className="flex gap-3 text-[15px] leading-6">
            <Icon aria-hidden className="mt-0.5 size-5 shrink-0 text-ink-muted" />
            {r}
          </li>
        ))}
      </ul>
    </section>
  );
}
