/**
 * Currency formatting ported verbatim from `main`'s
 * `frontend/src/shared/api/dashboardUtils.ts` (`formatCurrency`). `en-IE`/EUR
 * matches every money-visualisation figure the CDS money layer renders
 * (`StatFigure`, and every widget under
 * `app/(app)/dashboard/[groupId]/_widgets/**`).
 */
export function formatCurrency(amount: number): string {
  return new Intl.NumberFormat("en-IE", {
    style: "currency",
    currency: "EUR",
  }).format(amount);
}

/** Same as `formatCurrency`, but collapses amounts ≥ 1M to compact notation (e.g. "€1.2M"). */
export function formatCurrencyCompact(amount: number): string {
  if (Math.abs(amount) < 1_000_000) return formatCurrency(amount);
  return new Intl.NumberFormat("en-IE", {
    style: "currency",
    currency: "EUR",
    notation: "compact",
    maximumFractionDigits: 1,
  }).format(amount);
}
