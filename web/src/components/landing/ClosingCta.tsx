import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { Mascot } from "../Mascot";
import { btnClass } from "../ui/Btn";

/** The last band: one more way in, with the mascot ready to shop. */
export function ClosingCta() {
  // Last band: nothing overlaps it, so no extra bottom padding; it fades into the footer's paper ground.
  return (
    <section className="band bg-linear-to-b from-[#fdceae] to-paper pb-11! lg:pb-16!">
      <div className="page flex flex-col items-center gap-5 text-center md:flex-row md:text-start">
        <Mascot pose="bags" loading="lazy" className="-mb-2 size-36 md:order-last md:ms-auto md:-my-8 md:size-44" />
        <div>
          <h2 className="text-[26px] leading-9 font-light lg:text-[34px] lg:leading-12">
            آماده‌ی <span className="font-extrabold">خرید؟</span>
          </h2>
          <p className="mt-1 text-[15px] leading-6 lg:text-[17px] lg:leading-7">چند سوال کوتاه، بعد می‌بینی کدوم مغازه‌ها برای این مدل قیمت ثبت کردن.</p>
          <Link href="/start" className={`${btnClass()} mt-5 min-h-13! px-7! text-[17px]!`}>
            شروع کن
            <ArrowRight aria-hidden className="nudge size-5 flip-rtl" />
          </Link>
        </div>
      </div>
    </section>
  );
}
