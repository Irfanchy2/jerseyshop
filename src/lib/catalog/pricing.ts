/** Effective selling price, honouring scheduled promotions. Pure function (isomorphic). */
export type PriceFields = {
  priceMinor: number;
  compareAtMinor: number | null;
  salePriceMinor: number | null;
  saleStartsAt: Date | string | null;
  saleEndsAt: Date | string | null;
};

export function effectivePrice(p: PriceFields, variantPriceMinor?: number | null, now = new Date()) {
  const base = variantPriceMinor ?? p.priceMinor;
  const starts = p.saleStartsAt ? new Date(p.saleStartsAt) : null;
  const ends = p.saleEndsAt ? new Date(p.saleEndsAt) : null;
  const saleActive =
    p.salePriceMinor != null && p.salePriceMinor < base && (!starts || starts <= now) && (!ends || ends > now);
  const price = saleActive ? p.salePriceMinor! : base;
  const original = saleActive ? base : p.compareAtMinor && p.compareAtMinor > base ? p.compareAtMinor : null;
  return {
    price,
    original,
    onSale: original != null,
    percentOff: original ? Math.round(((original - price) / original) * 100) : 0,
  };
}
