import { Card } from "../../../shared/ui/Card";
import { formatCurrency } from "../../../shared/api/dashboardUtils";
import { Receipt } from "lucide-react";
import { Link } from "react-router-dom";
import { RecentExpense } from "../../../../../shared/src/types/redesign";

interface RecentExpensesProps {
  expenses: RecentExpense[];
  groupId: string;
}

export function RecentExpenses({ expenses, groupId }: RecentExpensesProps) {
  return (
    <Card title="Expenses">
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <div className="text-sm text-slate-500">Recent expenses</div>
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
            expenses.map((expense) => (
              <div key={expense.id} className="flex items-center gap-4">
                <div className="p-2 bg-brand-expense/10 text-brand-expense rounded-lg">
                  <Receipt size={18} />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex justify-between items-start">
                    <p className="text-sm font-medium text-slate-900 dark:text-white truncate">
                      {expense.description}
                    </p>
                    <span className="text-sm font-semibold text-slate-900 dark:text-white font-mono tnum">
                      {formatCurrency(expense.amount)}
                    </span>
                  </div>
                  <p className="text-xs text-slate-500 truncate">
                    {expense.payerName} • {expense.categoryName}
                  </p>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </Card>
  );
}
