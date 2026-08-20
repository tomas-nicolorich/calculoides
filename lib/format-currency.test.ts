import { describe, it, expect } from "vitest";
import { formatCurrency, formatCurrencyCompact } from "./format-currency";

/**
 * PR 12: pure formatting helper ported verbatim from `main`'s
 * `frontend/src/shared/api/dashboardUtils.ts` (`formatCurrency`), needed by
 * `RemainingBalance` and `RecentExpenses` (both render `en-IE`/EUR money
 * figures). Genuine RED — the module does not exist yet.
 */
describe("formatCurrency", () => {
  it("formats a positive amount as an EUR currency string", () => {
    expect(formatCurrency(1234.5)).toBe("€1,234.50");
  });

  it("formats zero as a currency figure, not a bare number", () => {
    expect(formatCurrency(0)).toBe("€0.00");
  });

  it("formats a negative amount with the sign before the currency symbol", () => {
    expect(formatCurrency(-42.5)).toBe("-€42.50");
  });
});

describe("formatCurrencyCompact", () => {
  it("formats amounts under 1M the same as formatCurrency", () => {
    expect(formatCurrencyCompact(1234.5)).toBe(formatCurrency(1234.5));
  });

  it("collapses amounts at or above 1M to compact notation", () => {
    expect(formatCurrencyCompact(1_200_000)).toBe("€1.2M");
  });
});
