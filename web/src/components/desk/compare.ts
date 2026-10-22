/** Compared ids that are not on the current desk (left over from earlier needs); the desk prunes them on load. */
export const staleCompareIds = (compare: string[], tiers: { productId: string }[]): string[] =>
  compare.filter((id) => !tiers.some((t) => t.productId === id));

/** Which empty desk to show: "other" = no desk for this category yet; "budget" = a supported category with no tier in the band. */
export const deskEmpty = (category: string | null, tiers: unknown[] | undefined): "other" | "budget" | null =>
  category === "other" ? "other" : tiers?.length === 0 ? "budget" : null;
