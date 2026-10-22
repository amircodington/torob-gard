import Link from "next/link";
import { ArrowRight, Sparkles } from "lucide-react";
import { Mascot } from "../Mascot";
import { btnClass } from "../ui/Btn";

const RISE = "animate-rise stagger";

export function Hero() {
  return (
    <section className="flex flex-col items-center pt-8 text-center lg:grid lg:min-h-[min(640px,calc(100svh-64px))] lg:grid-cols-[1.1fr_0.9fr] lg:items-center lg:gap-12 lg:pt-0 lg:text-start">
      {/* CSS rise from the server paint (no flash before hydration); the GSAP wave follows it. */}
      <Mascot
        pose="wave"
        react="wave"
        className="size-44 animate-rise [--rise:24px] [animation-duration:var(--duration-slow)] lg:order-last lg:size-80 lg:justify-self-center"
      />
      <div className="mt-8 flex flex-col items-center [--stagger:60ms] lg:mt-0 lg:items-start">
        <h1 className={`${RISE} text-balance text-[34px] leading-[48px] font-light tracking-[-0.01em] lg:text-[52px] lg:leading-[68px]`}>
          بیا با هم <span className="font-extrabold whitespace-nowrap">خریدِ خوب</span> رو پیدا کنیم!
        </h1>
        <p className={`${RISE} mt-3 text-[17px] leading-7 text-ink-muted [--i:1] lg:text-[19px] lg:leading-8`}>
          از <span className="font-extrabold text-ink">چی</span> بخرم تا از <span className="font-extrabold text-ink">کجا</span> بخرم!
        </p>
        <div className={`${RISE} mt-8 grid w-full grid-cols-2 gap-3 [--i:2] lg:flex lg:w-auto`}>
          <Link href="/start" className={`${btnClass()} min-h-13! lg:px-6! lg:text-[17px]!`}>
            شروع کن
            <ArrowRight aria-hidden className="size-5 flip-rtl" />
          </Link>
          <Link href="/start?seed=phone-camera" className={`${btnClass("ghost")} min-h-13! lg:px-6! lg:text-[17px]!`}>
            <Sparkles aria-hidden className="size-5" />
            سناریوی آماده
          </Link>
        </div>
      </div>
    </section>
  );
}
