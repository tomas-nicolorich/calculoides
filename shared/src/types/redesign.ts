import { z } from 'zod';
import { 
  DashboardSummarySchema, 
  CategoryWithBalancesSchema, 
  ExpensesListSchema,
  CategoryBalanceSchema,
  RecentExpenseSchema,
  TransferSchema,
  TransfersListSchema
} from '../schemas/redesign';

export type DashboardSummary = z.infer<typeof DashboardSummarySchema>;
export type RecentExpense = z.infer<typeof RecentExpenseSchema>;
export type Transfer = z.infer<typeof TransferSchema>;
export type TransfersList = z.infer<typeof TransfersListSchema>;
export type CategoryWithBalances = z.infer<typeof CategoryWithBalancesSchema>;
export type CategoryBalance = z.infer<typeof CategoryBalanceSchema>;
export type ExpensesList = z.infer<typeof ExpensesListSchema>;

export interface Group {
  id: string;
  name: string;
  role: 'OWNER' | 'MEMBER';
}
