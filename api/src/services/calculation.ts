import {
  calculateRoundedShares,
  MemberWithIncome,
  RoundedShare,
} from "../../../shared/logic/rounding";

export type MemberIncome = MemberWithIncome;
export type IncomeShare = RoundedShare;

/**
 * Calculates proportional income shares with remainder absorption by the highest earner.
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
