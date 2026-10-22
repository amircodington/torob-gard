import Link from "next/link";
import { Info, ShieldCheck } from "lucide-react";

const LINK = "inline-flex min-h-11 items-center gap-1.5 rounded-pill focus-visible:outline-2 focus-visible:outline-focus";

// Honesty rule 6: the credit line is on every page, at every width.
export function Footer() {
  return (
    <footer className="page flex flex-col items-center pb-6 pt-2 text-center text-[11px] font-semibold leading-5 text-ink-muted md:flex-row-reverse md:justify-between md:gap-6 md:text-start">
      <nav aria-label="پاورقی" className="flex justify-center gap-4 text-[13px]">
        <Link href="/about" className={LINK}>
          <Info aria-hidden className="size-4" />
          درباره
        </Link>
        <Link href="/privacy" className={LINK}>
          <ShieldCheck aria-hidden className="size-4" />
          حریم خصوصی
        </Link>
      </nav>
      <p>ترب‌گرد — پروژه‌ی چالش ترب/استارکوچ؛ محصول رسمی ترب نیست.</p>
    </footer>
  );
}
