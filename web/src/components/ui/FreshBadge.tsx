import { freshnessLabel, isStale } from "../../lib/fa";

/** Price age, always shown next to a price; past 60 days it says the price may have changed (PLAN §2). */
export function FreshBadge({ updatedMinAgo }: { updatedMinAgo: number }) {
  const stale = isStale(updatedMinAgo);
  return (
    <span className={`text-[12px] font-semibold leading-5 ${stale ? "text-signal" : "text-ink-muted"}`}>
      {freshnessLabel(updatedMinAgo)}
      {stale && " · ممکن است تغییر کرده باشد"}
    </span>
  );
}
