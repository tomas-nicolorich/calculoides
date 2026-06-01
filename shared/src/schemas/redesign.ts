import { z } from "zod";

export const DashboardMemberSchema = z.object({
  id: z.uuid(),
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
  payerName: z.string(),
});

export const TransferSchema = z.object({
  id: z.uuid(),
  categoryName: z.string(),
  fromMemberName: z.string(),
  toMemberName: z.string(),
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
  spent: z.number().nonnegative(),
  remainingQuota: z.number(),
});

export const CategoryWithBalancesSchema = z.object({
  id: z.uuid(),
  name: z.string(),
  monthlyBudget: z.number().nonnegative(),
  icon: z.string().optional(),
  balances: z.array(CategoryBalanceSchema),
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
      payerName: z.string(),
    }),
  ),
  pagination: z.object({
    total: z.number().nonnegative(),
    limit: z.number().positive(),
    offset: z.number().nonnegative(),
  }),
});
