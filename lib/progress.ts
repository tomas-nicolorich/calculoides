import type { ProgressState } from "../app/_ui/money/ProgressMeter";

/**
 * Spend as a percentage of budget, rounded for display. Ported verbatim
 * from `main`'s `frontend/src/shared/api/dashboardUtils.ts`. Guards
 * budget <= 0 (returns 0 when nothing is spent, else 100).
 */
export function progressPercent(spent: number, budget: number): number {
  if (budget <= 0) return spent > 0 ? 100 : 0;
  return Math.round((spent / budget) * 100);
}

/**
 * Urgency state for a budget figure (ADR 0007 thresholds). Computed from
 * the raw spent/budget ratio, not a rounded percent.
 * - < 80%     -> on-track
 * - 80%..100% -> behind
 * - > 100%    -> blocked
 */
export function progressState(spent: number, budget: number): ProgressState {
  if (budget <= 0) return spent > 0 ? "blocked" : "on-track";
  const pct = (spent / budget) * 100;
  if (pct > 100) return "blocked";
  if (pct >= 80) return "behind";
  return "on-track";
}
