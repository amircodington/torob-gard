import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { btnClass } from "./ui/Btn";

/** The wordmark, always a way home. */
export function Wordmark() {
  return (
    // aria-label: the two weight spans would otherwise be read as «ترب‌ گرد»
    <Link href="/" aria-label="ترب‌گرد" className="inline-flex min-h-11 items-center rounded-pill text-[17px] leading-none focus-visible:outline-2 focus-visible:outline-focus">
      <span className="font-light">ترب‌</span>
      <span className="font-extrabold">گرد</span>
    </Link>
  );
}

/** Header for the landing, about, privacy and error pages; same material as the journey TopBar. */
export function SiteHeader() {
  return (
    <header className="sticky top-0 z-40 bg-paper/80 backdrop-blur-md">
      <div className="page flex min-h-15 items-center gap-2 py-2">
        <Wordmark />
        <nav aria-label="سایت" className="ms-auto hidden items-center gap-1 text-[15px] font-semibold md:flex">
          <Link href="/#how" className="inline-flex min-h-11 items-center rounded-pill px-3 text-ink-muted hover:text-ink focus-visible:outline-2 focus-visible:outline-focus">
            چطور کار می‌کنه
          </Link>
          <Link href="/about" className="inline-flex min-h-11 items-center rounded-pill px-3 text-ink-muted hover:text-ink focus-visible:outline-2 focus-visible:outline-focus">
            درباره
          </Link>
          <Link href="/start" className={`${btnClass()} ms-2`}>
            شروع کن
            <ArrowRight aria-hidden className="size-5 shrink-0 flip-rtl" />
          </Link>
        </nav>
      </div>
    </header>
  );
}
