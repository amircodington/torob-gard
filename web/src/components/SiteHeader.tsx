import Link from "next/link";
import { ArrowRight, Info, Route, Search } from "lucide-react";
import { btnClass } from "./ui/Btn";
import { Wordmark } from "./Wordmark";

/** Header for the landing, about, privacy and error pages; same material as the journey TopBar. */
export function SiteHeader() {
  return (
    <header className="sticky top-0 z-40 bg-paper/80 backdrop-blur-md">
      <div className="page flex min-h-15 items-center gap-2 py-2">
        <Wordmark />
        <nav aria-label="سایت" className="ms-auto hidden items-center gap-1 text-[15px] font-semibold md:flex">
          <Link href="/#how" className="inline-flex min-h-11 items-center gap-1.5 rounded-pill px-3 text-ink-muted press hover:bg-surface-tint/70 hover:text-ink focus-visible:outline-2 focus-visible:outline-focus">
            <Route aria-hidden className="hover-hop size-4" />
            چطور کار می‌کنه
          </Link>
          <Link href="/search" className="inline-flex min-h-11 items-center gap-1.5 rounded-pill px-3 text-ink-muted press hover:bg-surface-tint/70 hover:text-ink focus-visible:outline-2 focus-visible:outline-focus">
            <Search aria-hidden className="hover-hop size-4" />
            جستجو
          </Link>
          <Link href="/about" className="inline-flex min-h-11 items-center gap-1.5 rounded-pill px-3 text-ink-muted press hover:bg-surface-tint/70 hover:text-ink focus-visible:outline-2 focus-visible:outline-focus">
            <Info aria-hidden className="hover-hop size-4" />
            درباره
          </Link>
          <Link href="/start" className={`${btnClass()} ms-2`}>
            شروع کن
            <ArrowRight aria-hidden className="nudge size-5 shrink-0 flip-rtl" />
          </Link>
        </nav>
      </div>
    </header>
  );
}
