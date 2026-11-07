import { z } from "zod";

const DashboardMemberSchema = z.object({
  id: z.uuid(),
  userId: z.uuid(),
  name: z.string(),
  income: z.number().nonnegative(),
  share: z.number().min(0).max(100),
  spent: z.number().nonnegative(),
  remainingQuota: z.number(),
  budgeted: z.number().nonnegative(),
});

export const RecentExpenseSchema = z.object({
  id: z.uuid(),
  description: z.string(),
  amount: z.number().positive(),
  date: z.iso.datetime(),
  categoryName: z.string(),
  categoryId: z.uuid(),
  payerName: z.string(),
  payerId: z.uuid(),
});

const TransferSchema = z.object({
  id: z.uuid(),
  categoryId: z.uuid(),
  categoryName: z.string(),
  categoryIcon: z.string(),
  fromMemberName: z.string(),
  fromMemberId: z.uuid(),
  toMemberName: z.string(),
  toMemberId: z.uuid(),
  amount: z.number().positive(),
  date: z.iso.datetime(),
});

export const TransfersListSchema = z.object({
  transfers: z.array(TransferSchema),
  pagination: z.object({
    total: z.number().nonnegative(),
    limit: z.number().positive(),
    offset: z.number().nonnegative(),
  }),
});

export const DashboardSummarySchema = z.object({
  groupName: z.string(),
  ownerId: z.uuid(),
  totalIncome: z.number().nonnegative(),
  totalBudget: z.number().nonnegative(),
  totalSpent: z.number().nonnegative(),
  members: z.array(DashboardMemberSchema),
  recentExpenses: z.array(RecentExpenseSchema),
  recentTransfers: z.array(TransferSchema),
});

export const CategoryBalanceSchema = z.object({
  memberId: z.uuid(),
  quota: z.number().nonnegative(),
  /** Canonical 1dp display share (0..100); sums to exactly 100.0 per category. */
  percentage: z.number().nonnegative(),
  /** True when the member is zero-income and excluded from allocation (#130). */
  excluded: z.boolean().optional(),
  spent: z.number().nonnegative(),
  remainingQuota: z.number(),
});

export const CategoryWithBalancesSchema = z.object({
  id: z.uuid(),
  name: z.string(),
  monthlyBudget: z.number().nonnegative(),
  icon: z.string().optional(),
  balances: z.array(CategoryBalanceSchema),
  /**
   * True when the category has no eligible (income > 0) members, so no
   * allocation was computed — the frontend shows an empty state (#130).
   */
  isEmpty: z.boolean().optional(),
});

export const ExpensesListSchema = z.object({
  expenses: z.array(
    z.object({
      id: z.uuid(),
      categoryId: z.uuid(),
      payerId: z.uuid(),
      description: z.string(),
      amount: z.number().positive(),
      date: z.iso.datetime(),
      categoryName: z.string(),
      categoryIcon: z.string(),
      payerName: z.string(),
    }),
  ),
  pagination: z.object({
    total: z.number().nonnegative(),
    limit: z.number().positive(),
    offset: z.number().nonnegative(),
  }),
});
