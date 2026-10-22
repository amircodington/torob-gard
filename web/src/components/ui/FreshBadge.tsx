import { Clock3, TriangleAlert } from "lucide-react";
import { faFreshness, freshnessLabel, isStale } from "../../lib/fa";

/** Price age, always shown next to a price; past 60 days it says the price may have changed (PLAN §2). */
export function FreshBadge({ updatedMinAgo, prefix = "" }: { updatedMinAgo: number; prefix?: string }) {
  const stale = isStale(updatedMinAgo);
  // freshnessLabel's «(قدیمی)» would be a second stale marker next to the honesty suffix.
  const text = stale ? `به‌روزرسانی ${faFreshness(updatedMinAgo)} · ممکن است تغییر کرده باشد` : freshnessLabel(updatedMinAgo);
  const Icon = stale ? TriangleAlert : Clock3;
  return (
    // items-start + mt: the icon sits on the first line when the stale text wraps
    <span className={`inline-flex items-start gap-1 text-[12px] font-semibold leading-5 ${stale ? "text-signal" : "text-ink-muted"}`}>
      <Icon aria-hidden className="mt-[3px] size-3.5 shrink-0" />
      <span>{prefix + text}</span>
    </span>
  );
}
