import type { StockStatus } from "../../lib/types";

/** Only a shop's own confirmation is «تأییدشده»; the data alone never says «موجود». */
export function StockBadge({ stock }: { stock: StockStatus }) {
  return stock === "confirmed" ? (
    <span className="inline-flex rounded-pill bg-verified px-2.5 py-0.5 text-[12px] font-bold text-on-dark">موجودی تأییدشده</span>
  ) : (
    <span className="text-[12px] font-semibold text-ink-muted">موجودی نامشخص</span>
  );
}
