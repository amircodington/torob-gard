import Link from "next/link";
import { ArrowRight, Sparkles } from "lucide-react";
import { Mascot } from "../Mascot";
import { btnClass } from "../ui/Btn";

const RISE = "animate-rise stagger";

/** The hero art's calm side is #fdceae (sampled), so the art runs into the band without a seam. */
export function Hero() {
  return (
    <section className="relative overflow-hidden bg-[#fdceae] lg:flex lg:h-[clamp(520px,42vw,680px)] lg:items-center">
      {/* Phone: the scene on top (its calm side cropped off); lg: the whole art at full height on the left, copy over its calm side (RTL start). */}
      <picture>
        <source media="(min-width: 1024px)" srcSet="/mascot/hero-pasazh-1600.webp" />
        <img
          src="/mascot/hero-pasazh-900.webp"
          alt="ترب‌گرد با کوله‌پشتی وسط راهروی یه پاساژ موبایل و لپ‌تاپ"
          width={900}
          height={502}
          fetchPriority="high"
          className="block aspect-[4/3] w-full object-cover object-left-bottom lg:absolute lg:inset-y-0 lg:left-0 lg:aspect-auto lg:h-full lg:w-auto lg:max-w-none"
        />
      </picture>
      {/* Phone: the art fades into the copy; lg: a wash keeps the copy side calm at narrow widths. */}
      <div aria-hidden className="pointer-events-none absolute inset-x-0 top-[calc(75vw-3rem)] h-12 bg-linear-to-b from-transparent to-[#fdceae] lg:inset-y-0 lg:start-0 lg:end-auto lg:top-0 lg:h-full lg:w-1/2 lg:bg-linear-to-l lg:from-[#fdceae] lg:from-40% lg:to-transparent" />

      <div className="page relative pt-2 pb-12 lg:mt-0 lg:flex lg:items-center lg:self-stretch lg:pb-0">
        <div className="flex flex-col items-start [--stagger:60ms] lg:w-[44%]">
          <h1 className={`${RISE} max-w-[13.5rem] text-[32px] leading-[46px] font-light tracking-[-0.01em] text-balance sm:max-w-none lg:text-[52px] lg:leading-[68px]`}>
            بیا با هم <span className="font-extrabold whitespace-nowrap">خریدِ خوب</span> رو پیدا کنیم!
          </h1>
          <p className={`${RISE} mt-3 text-[17px] leading-7 [--i:1] lg:text-[20px] lg:leading-8`}>
            از <span className="font-extrabold">چی</span> بخرم تا از <span className="font-extrabold">کجا</span> بخرم!
          </p>
          <div className={`${RISE} mt-7 grid w-full grid-cols-2 gap-3 [--i:2] lg:mt-9 lg:flex lg:w-auto`}>
            <Link href="/start" className={`${btnClass()} min-h-13! whitespace-nowrap max-[359px]:px-3! lg:px-7! lg:text-[17px]!`}>
              شروع کن
              <ArrowRight aria-hidden className="size-5 flip-rtl" />
            </Link>
            <Link href="/start?seed=phone-camera" className={`${btnClass("ghost")} min-h-13! whitespace-nowrap bg-surface! max-[359px]:px-3! lg:px-7! lg:text-[17px]!`}>
              <Sparkles aria-hidden className="size-5" />
              سناریوی آماده
            </Link>
          </div>
        </div>
        {/* The guide waves beside the headline (phone) / stands on the hero's floor at the seam of the art, level with the CTA (lg). */}
        <Mascot
          pose="wave"
          react={["pop", "float", "wave"]}
          loading="eager"
          className="absolute -top-6 end-2 size-28 lg:end-[50%] lg:top-auto lg:bottom-8 lg:size-56"
        />
      </div>
    </section>
  );
}
