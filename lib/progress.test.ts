import { describe, it, expect } from "vitest";
import { progressPercent, progressState } from "./progress";

/**
 * PR 14: pure budget-urgency helpers ported verbatim from `main`'s
 * `frontend/src/shared/api/dashboardUtils.ts` (`progressPercent`,
 * `progressState`), needed by `BudgetCategories`' header and per-member
 * `ProgressMeter`s (ADR 0007 thresholds: <80% on-track, 80-100% behind,
 * >100% blocked). Genuine RED — the module does not exist yet.
 */
describe("progressPercent", () => {
  it("rounds spend as a percentage of budget", () => {
    expect(progressPercent(400, 1000)).toBe(40);
  });

  it("returns 0 when nothing spent against a zero-or-negative budget", () => {
    expect(progressPercent(0, 0)).toBe(0);
  });

  it("returns 100 when something spent against a zero-or-negative budget", () => {
    expect(progressPercent(10, 0)).toBe(100);
  });

  it("rounds to the nearest whole percent", () => {
    expect(progressPercent(790, 1000)).toBe(79);
    expect(progressPercent(800, 1000)).toBe(80);
    expect(progressPercent(1010, 1000)).toBe(101);
  });
});

describe("progressState", () => {
  it("is on-track below 80%", () => {
    expect(progressState(700, 1000)).toBe("on-track");
  });

  it("is behind between 80% and 100% inclusive", () => {
    expect(progressState(800, 1000)).toBe("behind");
    expect(progressState(1000, 1000)).toBe("behind");
  });

  it("is blocked above 100%", () => {
    expect(progressState(1100, 1000)).toBe("blocked");
  });

  it("treats a zero-or-negative budget with spend as blocked", () => {
    expect(progressState(10, 0)).toBe("blocked");
  });

  it("treats a zero-or-negative budget with no spend as on-track", () => {
    expect(progressState(0, 0)).toBe("on-track");
  });
});
