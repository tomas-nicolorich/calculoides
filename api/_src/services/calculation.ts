import { calculateRoundedShares, MemberWithIncome, RoundedShare } from "shared";

export type MemberIncome = MemberWithIncome;
export type IncomeShare = RoundedShare;

/**
 * Calculates proportional income shares. The money `share` (0..1) absorbs its
 * rounding deficit on the highest earner; the display `percentage` (1dp) is
 * allocated by largest remainder so it always sums to exactly 100.0 (issue #128).
 */
export function calculateIncomeShares(members: MemberIncome[]): IncomeShare[] {
  return calculateRoundedShares(members);
}

export interface CategoryBalance {
  memberId: string;
  quota: number;
  totalQuota: number;
  spent: number;
  remainingQuota: number;
}

/**
 * Returns income shares for all or a subset of members based on memberLinks.
 * Used when a category is restricted to specific members.
 */
export function resolveRelevantShares(
  members: { id: string; income: number }[],
  memberLinks: { memberId: string }[],
  baseShares: IncomeShare[],
): IncomeShare[] {
  if (memberLinks.length === 0) return baseShares;
  const subsetMembers = members
    .filter((m) => memberLinks.some((ml) => ml.memberId === m.id))
    .map((m) => ({ id: m.id, income: m.income }));
  return calculateIncomeShares(subsetMembers);
}

/**
 * Calculates member-specific balances for a category.
 * Integrates proportional shares, expenses, and transfers.
 */
export function calculateCategoryBalances(
  category: { monthlyBudget: number },
  members: { id: string; share: number }[],
  expenses: { payerId: string; amount: number }[],
  transfers: {
    fromMemberId: string;
    toMemberId: string;
    amount: number;
  }[] = [],
): CategoryBalance[] {
  return members.map((m) => {
    const baseQuota = category.monthlyBudget * m.share;

    const memberExpenses = expenses
      .filter((e) => e.payerId === m.id)
      .reduce((acc, e) => acc + e.amount, 0);

    const outTransfers = transfers
      .filter((t) => t.fromMemberId === m.id)
      .reduce((acc, t) => acc + t.amount, 0);
    const inTransfers = transfers
      .filter((t) => t.toMemberId === m.id)
      .reduce((acc, t) => acc + t.amount, 0);

    const adjustedQuota = baseQuota - outTransfers + inTransfers;

    return {
      memberId: m.id,
      quota: Number(adjustedQuota.toFixed(2)),
      totalQuota: Number(adjustedQuota.toFixed(2)),
      spent: Number(memberExpenses.toFixed(2)),
      remainingQuota: Number((adjustedQuota - memberExpenses).toFixed(2)),
    };
  });
}
