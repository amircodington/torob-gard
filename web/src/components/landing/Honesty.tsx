import { CalendarClock, CircleDashed, CircleHelp, Filter, Info, PackageSearch, ShieldCheck } from "lucide-react";
import { SectionHead } from "./SectionHead";

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
    <section className="band bg-linear-to-b from-blush-soft to-blush">
      <div className="page">
        <SectionHead icon={ShieldCheck} mascot="check" title={<>قول‌های <span className="font-extrabold">ما</span></>} sub="چیزی که نمی‌دونیم رو نمی‌گیم." />
        <ul data-reveal className="mt-6 grid gap-3 md:grid-cols-2 lg:mt-8 lg:grid-cols-3 lg:gap-4">
          {RULES.map(({ r, icon: Icon }) => (
            <li key={r} className="lift flex gap-3 rounded-lg bg-surface p-5 text-[15px] leading-6 shadow-card">
              <span className="grid size-10 shrink-0 place-items-center rounded-full bg-orange-tint">
                <Icon aria-hidden className="size-5" />
              </span>
              <span className="self-center">{r}</span>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
