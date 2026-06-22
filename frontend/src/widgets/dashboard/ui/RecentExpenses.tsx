import { Card } from "../../../shared/ui/Card";
import { formatCurrency } from "../../../shared/api/dashboardUtils";
import { Link } from "react-router-dom";
import { RecentExpense } from "../../../../../shared/src/types/redesign";
import { CategoryIconTile } from "../../../shared/lib/categoryIcons";
import { Avatar } from "../../../shared/ui/Avatar";
import { Badge } from "../../../shared/ui/Badge";

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
  categories,
}: RecentExpensesProps) {
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
            expenses.map((expense) => {
              const payer = members.find((m) => m.id === expense.payerId);
              const category = categories.find(
                (c) => c.id === expense.categoryId,
              );
              return (
                <div key={expense.id} className="flex items-center gap-4">
                  <CategoryIconTile icon={category?.icon} size="md" />
                  <div className="flex-1 min-w-0">
                    <div className="flex justify-between items-start gap-2">
                      <p className="text-sm font-medium text-slate-900 dark:text-white truncate">
                        {expense.description}
                      </p>
                      <span className="text-sm font-semibold text-brand-expense font-mono tnum">
                        {formatCurrency(expense.amount)}
                      </span>
                    </div>
                    <div className="flex items-center gap-2 mt-1 min-w-0">
                      <Avatar
                        size="sm"
                        name={payer?.name ?? expense.payerName}
                        colorIndex={payer?.colorIndex ?? 0}
                      />
                      <span className="text-xs text-slate-500 truncate">
                        {payer?.name ?? expense.payerName}
                      </span>
                      <Badge tone="category" size="sm">
                        {expense.categoryName}
                      </Badge>
                    </div>
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
