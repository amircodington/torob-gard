import { CircleHelp, PackageCheck } from "lucide-react";
import type { StockStatus } from "../../lib/types";

/** Only a shop's own confirmation is «تأییدشده»; the data alone never says «موجود». */
export function StockBadge({ stock }: { stock: StockStatus }) {
  return stock === "confirmed" ? (
    <span className="inline-flex shrink-0 items-center gap-1 whitespace-nowrap rounded-pill bg-verified px-2.5 py-0.5 text-[12px] font-bold text-on-dark">
      <PackageCheck aria-hidden className="size-3.5 shrink-0" />
      موجودی تأییدشده
    </span>
  ) : (
    <span className="inline-flex shrink-0 items-center gap-1 whitespace-nowrap text-[12px] font-semibold text-ink-muted">
      <CircleHelp aria-hidden className="size-3.5 shrink-0" />
      موجودی نامشخص
    </span>
  );
}
