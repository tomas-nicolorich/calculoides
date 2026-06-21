import type { ProgressState } from "../ui/money/ProgressMeter";

export function calculateTotalIncome(members: { income: number }[]) {
  return members.reduce((sum, m) => sum + m.income, 0);
}

/**
 * Spend as a percentage of budget, rounded for display.
 * Guards budget <= 0 (returns 0 when nothing is spent, else 100).
 */
export function progressPercent(spent: number, budget: number): number {
  if (budget <= 0) return spent > 0 ? 100 : 0;
  return Math.round((spent / budget) * 100);
}

/**
 * Urgency state for a budget figure (ADR 0007 thresholds).
 * Computed from the raw spent/budget ratio, not a rounded percent.
 * - < 80%        → on-track
 * - 80%..100%    → behind
 * - > 100%       → blocked
 */
export function progressState(spent: number, budget: number): ProgressState {
  if (budget <= 0) return spent > 0 ? "blocked" : "on-track";
  const pct = (spent / budget) * 100;
  if (pct > 100) return "blocked";
  if (pct >= 80) return "behind";
  return "on-track";
}

export function formatCurrency(amount: number) {
  return new Intl.NumberFormat("en-IE", {
    style: "currency",
    currency: "EUR",
  }).format(amount);
}

export function categoryMemberShare(
  allMembers: { id: string; income: number }[],
  balanceMemberIds: string[],
): { memberId: string; share: number }[] {
  const isSubset = balanceMemberIds.length < allMembers.length;
  const participating = isSubset
    ? allMembers.filter((m) => balanceMemberIds.includes(m.id))
    : allMembers;

  const totalIncome = participating.reduce((sum, m) => sum + m.income, 0);
  if (totalIncome === 0) {
    return balanceMemberIds.map((id) => ({ memberId: id, share: 0 }));
  }

  return participating.map((m) => ({
    memberId: m.id,
    share: Math.round((m.income / totalIncome) * 1000) / 10,
  }));
}
