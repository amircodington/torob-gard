import Link from "next/link";
import type { ReactNode } from "react";
import type { LucideIcon } from "lucide-react";
import { Mascot } from "../Mascot";
import { img } from "../../lib/img";
import { ldJson } from "../../lib/seo";

export const CARD = "rounded-lg bg-surface p-5 shadow-card";
/** A list row link: tint on hover, a 0.99 press; a `nudge` chevron inside slides toward the reading direction. */
export const ROW_LINK = "flex min-h-11 items-center gap-3 rounded-md px-2 py-2 -mx-2 press [--press:0.99] hover:bg-surface-tint focus-visible:outline-2 focus-visible:outline-focus";

export function JsonLd({ data }: { data: object }) {
  return <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: ldJson(data) }} />;
}

/** Torob product image or the idle mascot; plain <img> as in the desk (next/image would proxy it). */
export function Thumb({ src, className = "size-16" }: { src: string | null; className?: string }) {
  if (!src) return <Mascot pose="idle" className={`${className} shrink-0`} />;
  // eslint-disable-next-line @next/next/no-img-element
  return <img src={img(src)} alt="" loading="lazy" className={`${className} hover-zoom shrink-0 rounded-sm bg-surface-tint object-contain`} />;
}

/** «پاساژ › …» trail above a catalog h1. */
export function Crumbs({ items }: { items: { href: string; label: string }[] }) {
  return (
    <nav aria-label="مسیر" className="flex flex-wrap items-center gap-x-1 text-[13px] font-semibold text-ink-muted">
      {items.map((c, i) => (
        <span key={c.href} className="inline-flex items-center gap-1">
          {i > 0 && <span aria-hidden>‹</span>}
          <Link href={c.href} className="inline-flex min-h-11 items-center transition-colors duration-(--duration-fast) hover:text-ink focus-visible:outline-2 focus-visible:outline-focus">{c.label}</Link>
        </span>
      ))}
    </nav>
  );
}

/** A catalog card; `icon` (orange, beside the title) helps a long page scan. */
export function Section({ title, icon: Icon, children, testId }: { title: ReactNode; icon?: LucideIcon; children: ReactNode; testId?: string }) {
  return (
    <section data-testid={testId} className={CARD}>
      <h2 className="flex items-center gap-2 text-[17px] font-extrabold leading-7">
        {Icon && <Icon aria-hidden className="size-5 text-orange" />}
        {title}
      </h2>
      <div className="mt-2">{children}</div>
    </section>
  );
}
