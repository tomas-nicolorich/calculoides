import { z } from "zod";
import {
  DashboardSummarySchema,
  CategoryWithBalancesSchema,
  ExpensesListSchema,
  TransfersListSchema,
} from "../schemas/redesign";

export type DashboardSummary = z.infer<typeof DashboardSummarySchema>;
export type TransfersList = z.infer<typeof TransfersListSchema>;
export type CategoryWithBalances = z.infer<typeof CategoryWithBalancesSchema>;
export type ExpensesList = z.infer<typeof ExpensesListSchema>;
