import type { ReactNode } from "react";
import { CARD } from "../catalog/parts";
import { SiteHeader } from "../SiteHeader";
import { Wordmark } from "../Wordmark";

/** A placeholder block; size and radius from className. The sheen is a translated overlay (compositor only), gone under reduced motion. */
export function Skeleton({ className = "" }: { className?: string }) {
  return (
    <div aria-hidden data-skeleton className={`relative overflow-hidden rounded-sm bg-surface-tint ${className}`}>
      <span className="absolute inset-0 animate-shimmer bg-linear-to-l from-transparent via-white/70 to-transparent motion-reduce:hidden" />
    </div>
  );
}

/** One catalog row (ROW_LINK geometry): an optional thumb and `lines` text bars of the real line heights. */
function Row({ thumb, lines }: { thumb?: string; lines: string[] }) {
  return (
    <div className="flex min-h-11 items-center gap-3 py-2">
      {thumb && <Skeleton className={`${thumb} shrink-0`} />}
      <div className="flex min-w-0 flex-1 flex-col">
        {lines.map((h, i) => (
          // each bar is its line's text height, centred in its line box
          <div key={i} className={`flex items-center ${h}`}>
            <Skeleton className={`h-[55%] rounded-pill ${i ? "w-2/5" : "w-4/5"}`} />
          </div>
        ))}
      </div>
    </div>
  );
}

/** A Section card (catalog/parts) of rows. Line heights are the real rows' (leading-5/6). */
export function SkeletonCard({ rows = 4, thumb, lines = ["h-6", "h-5"] }: { rows?: number; thumb?: string; lines?: string[] }) {
  return (
    <div className={CARD}>
      <div className="flex h-7 items-center">
        <Skeleton className="h-[60%] w-36 rounded-pill" />
      </div>
      <div className="mt-2 divide-y divide-line">
        {Array.from({ length: rows }, (_, i) => (
          <Row key={i} thumb={thumb} lines={lines} />
        ))}
      </div>
    </div>
  );
}

/** A catalog page while its data loads: the real header, then `children` placeholders in the page's own column.
 *  The placeholders appear after the loader's 150 ms delay; the header never flickers. */
export function SkeletonPage({ children, label = "در حال بارگذاری" }: { children: ReactNode; label?: string }) {
  return (
    <>
      <SiteHeader />
      <main role="status" aria-label={label} className="page flex animate-loader-in flex-col gap-4 pt-6 pb-12">
        {children}
      </main>
    </>
  );
}

/** A journey page's TopBar (same height and wordmark; the step pill as a placeholder) for route loaders.
 *  ponytail: no SessionProvider here (it would hydrate and navigate); the real TopBar replaces this on load. */
export function SkeletonBar() {
  return (
    <header className="sticky top-0 z-40 bg-paper/80 backdrop-blur-md">
      <div className="page flex items-center gap-2 py-1.5">
        <Wordmark />
        <Skeleton className="ms-auto h-12 w-[186px] rounded-pill" />
      </div>
    </header>
  );
}

/** h1 placeholder at the catalog title's line height (leading-10). */
export function SkeletonTitle({ className = "w-3/5" }: { className?: string }) {
  return (
    <div className="flex h-10 items-center">
      <Skeleton className={`h-[60%] max-w-md rounded-pill ${className}`} />
    </div>
  );
}

/** The desk's three tier cards at their measured heights (phone ~500 px, lg subgrid ~630 px): pill, title, specs, price box, note, actions. */
export function TierSkeletons() {
  return (
    <div aria-busy="true" aria-label="در حال آماده کردن گزینه‌ها" className="mt-5 grid animate-loader-in gap-4 lg:mt-8 lg:grid-cols-3">
      {[0, 1, 2].map((i) => (
        <div key={i} className="flex h-[500px] flex-col gap-3 rounded-lg bg-surface p-5 shadow-card lg:h-[630px]">
          <Skeleton className="h-8 w-24 rounded-pill" />
          <Skeleton className="mt-2 h-5 w-4/5 rounded-pill" />
          <Skeleton className="h-5 w-3/5 rounded-pill" />
          <Skeleton className="mt-2 h-3.5 w-2/5 rounded-pill" />
          <Skeleton className="h-3.5 w-1/2 rounded-pill" />
          <Skeleton className="mt-2 h-22 rounded-md" />
          <Skeleton className="h-3.5 w-11/12 rounded-pill" />
          <div className="mt-auto flex gap-2">
            <Skeleton className="h-12 flex-1 rounded-pill" />
            <Skeleton className="h-12 w-28 rounded-pill" />
          </div>
        </div>
      ))}
    </div>
  );
}

/** The radar's shop rows at their measured heights (phone ~176 px with wrapped lines, lg 157 px): icon, name, place, price. */
export function RowSkeletons() {
  return (
    <div aria-busy="true" aria-label="در حال پیدا کردن فروشگاه‌ها" className="grid animate-loader-in gap-3">
      {[0, 1, 2, 3].map((i) => (
        <div key={i} className="flex h-[176px] gap-3 rounded-lg bg-surface p-4 shadow-card lg:h-[157px]">
          <Skeleton className="size-11 rounded-full" />
          <div className="flex flex-1 flex-col gap-2.5 pt-1">
            <Skeleton className="h-4.5 w-2/5 rounded-pill" />
            <Skeleton className="h-3.5 w-4/5 rounded-pill" />
            <Skeleton className="h-3.5 w-3/5 rounded-pill" />
            <Skeleton className="h-3.5 w-1/3 rounded-pill" />
          </div>
          <Skeleton className="h-5 w-14 rounded-pill" />
        </div>
      ))}
    </div>
  );
}
