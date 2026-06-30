import {
  calculateRoundedShares,
  largestRemainderAllocate,
  MemberWithIncome,
  RoundedShare,
} from "shared";

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
  /** 2dp money quota; quotas across a category sum EXACTLY to its budget. */
  quota: number;
  totalQuota: number;
  /** 1dp display share (0..100); sums to exactly 100.0 within the category. */
  percentage: number;
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
 *
 * Quotas are derived from the members' PRECISE income weights via the shared
 * cent-quantum largest-remainder allocator, so they sum EXACTLY to the
 * category budget (no cent leak). The displayed `percentage` (1dp) is a second,
 * independent largest-remainder pass over the same incomes — purely cosmetic and
 * deliberately decoupled from the money (PRD invariant, issue #129/#126).
 *
 * `members` must already be the category's eligible subset; the allocator runs
 * over exactly those incomes (restricted-subset renormalization).
 */
export function calculateCategoryBalances(
  category: { monthlyBudget: number },
  members: { id: string; income: number }[],
  expenses: { payerId: string; amount: number }[],
  transfers: {
    fromMemberId: string;
    toMemberId: string;
    amount: number;
  }[] = [],
): CategoryBalance[] {
  const ids = members.map((m) => m.id);
  const incomes = members.map((m) => m.income);

  // Quota: precise income weights, cent quantum → sums EXACTLY to the budget.
  const quotas = largestRemainderAllocate(
    incomes,
    category.monthlyBudget,
    0.01,
    ids,
  );
  // Percentage: same incomes, 0.1 quantum → sums EXACTLY to 100.0. Cosmetic.
  const percentages = largestRemainderAllocate(incomes, 100, 0.1, ids);

  return members.map((m, i) => {
    const baseQuota = quotas[i];

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
      percentage: percentages[i],
      spent: Number(memberExpenses.toFixed(2)),
      remainingQuota: Number((adjustedQuota - memberExpenses).toFixed(2)),
    };
  });
}
