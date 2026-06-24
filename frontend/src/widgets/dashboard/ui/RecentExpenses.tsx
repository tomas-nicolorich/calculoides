import { Card } from "../../../shared/ui/Card";
import { formatCurrency } from "../../../shared/api/dashboardUtils";
import { Link } from "react-router-dom";
import { RecentExpense } from "../../../../../shared/src/types/redesign";
import { Avatar } from "../../../shared/ui/Avatar";
import { Receipt } from "lucide-react";

interface ExpenseMember {
  id: string;
  name: string;
  colorIndex: number;
}

interface ExpenseCategory {
  id: string;
  icon?: string;
}

interface RecentExpensesProps {
  expenses: RecentExpense[];
  groupId: string;
  members: ExpenseMember[];
  categories: ExpenseCategory[];
}

export function RecentExpenses({
  expenses,
  groupId,
  members,
}: RecentExpensesProps) {
  return (
    <Card title="Recent Expenses">
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <div className="text-sm text-slate-400">Latest 5 spends</div>
          <Link
            to={`/expenses/${groupId}`}
            className="text-sm font-medium text-brand-balance hover:underline"
          >
            View All
          </Link>
        </div>

        <div className="space-y-4">
          {expenses.length === 0 ? (
            <div className="text-center py-8 text-slate-400 text-sm">
              No recent expenses
            </div>
          ) : (
            expenses.map((expense) => {
              const payer = members.find((m) => m.id === expense.payerId);
              const payerFirstName = (payer?.name ?? expense.payerName).split(
                " ",
              )[0];
              return (
                <div key={expense.id} className="flex items-center gap-4">
                  <span
                    className="grid place-items-center size-9 shrink-0 rounded-lg bg-brand-expense/10 text-brand-expense"
                    data-testid="expense-marker"
                  >
                    <Receipt size={18} />
                  </span>
                  <div className="flex-1 min-w-0">
                    <div className="flex justify-between items-start gap-2">
                      <p className="text-sm font-medium text-slate-900 dark:text-white truncate">
                        {expense.description}
                      </p>
                      <span className="text-sm font-semibold text-brand-expense font-mono tnum">
                        -{formatCurrency(expense.amount)}
                      </span>
                    </div>
                    <p className="flex items-center gap-1 mt-1 text-xs text-slate-500 min-w-0">
                      <Avatar
                        size="xs"
                        name={payer?.name ?? expense.payerName}
                        colorIndex={payer?.colorIndex ?? 0}
                      />
                      <span>{payerFirstName}</span>
                      <span>·</span>
                      <span className="truncate">{expense.categoryName}</span>
                    </p>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>
    </Card>
  );
}
