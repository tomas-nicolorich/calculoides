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
