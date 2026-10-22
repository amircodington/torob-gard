/** Compared ids that are not on the current desk (left over from earlier needs); the desk prunes them on load. */
export const staleCompareIds = (compare: string[], tiers: { productId: string }[]): string[] =>
  compare.filter((id) => !tiers.some((t) => t.productId === id));
