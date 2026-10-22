/** Compared ids that are not on the current desk (left over from earlier needs); the desk prunes them on load. */
export const staleCompareIds = (compare: string[], tiers: { productId: string }[]): string[] =>
  compare.filter((id) => !tiers.some((t) => t.productId === id));

/** Which empty desk to show: "other" = no desk for this category yet; "budget" = a supported category with no tier in the band. */
export const deskEmpty = (category: string | null, tiers: unknown[] | undefined): "other" | "budget" | null =>
  category === "other" ? "other" : tiers?.length === 0 ? "budget" : null;

type Row = { productId: string; price: number; offerCount: number; newestPriceAt: string | null };
/** Ids holding the best value of `score` (higher wins); ties keep every tied id; NaN (no data) never wins. */
const top = (rows: Row[], score: (r: Row) => number): string[] => {
  const max = Math.max(...rows.map(score).filter((s) => !Number.isNaN(s)));
  return rows.filter((r) => score(r) === max).map((r) => r.productId);
};

/** The compare table's highlights: lowest price, most shops, newest recorded price. */
export const bestOf = (rows: Row[]) => ({
  price: top(rows, (r) => -r.price),
  offers: top(rows, (r) => r.offerCount),
  fresh: top(rows, (r) => (r.newestPriceAt ? Date.parse(r.newestPriceAt) : NaN)),
});
