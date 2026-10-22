import Link from "next/link";
import { Mascot } from "../Mascot";

const BTN = "inline-flex min-h-11 items-center justify-center rounded-pill px-6 text-[15px] font-bold transition-transform focus-visible:outline-2 focus-visible:outline-focus active:scale-[0.97]";

export function Hero() {
  return (
    <section className="flex flex-col items-center pt-16 text-center">
      <Mascot pose="wave" className="size-44" />
      <h1 className="mt-8 text-[34px] leading-[48px] font-light">
        بیا با هم <span className="font-extrabold">خریدِ خوب</span> رو پیدا کنیم!
      </h1>
      <p className="mt-3 text-[17px] leading-7 text-ink-muted">
        از <span className="font-extrabold text-ink">چی</span> بخرم تا از <span className="font-extrabold text-ink">کجا</span> بخرم!
      </p>
      <div className="mt-8 flex w-full flex-col gap-3">
        <Link href="/start" className={`${BTN} min-h-13 bg-orange text-[17px] text-on-orange shadow-card`}>
          شروع کن
        </Link>
        <Link href="/start?seed=phone-camera" className={`${BTN} bg-surface-tint text-ink`}>
          سناریوی آماده
        </Link>
      </div>
    </section>
  );
}
