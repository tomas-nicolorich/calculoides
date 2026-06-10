import { useState } from "react";
import { LoadingCard } from "../../../shared/ui/LoadingCard";
import { formatCurrency } from "../../../shared/api/dashboardUtils";
import {
  useExpensesList,
  useDashboardSummary,
  useCategoriesList,
} from "../../../shared/api/dashboardHooks";
import { ExpenseFilter } from "../../../features/expense-filtering/ui/ExpenseFilter";
import { useParams, useNavigate } from "react-router-dom";
import { ArrowLeft, Receipt, Trash2 } from "lucide-react";
import { expenseApi } from "../../../entities/expense";
import { Button } from "../../../shared/ui";
import { Dialog, DialogFooter } from "../../../shared/ui/Dialog";

export function ExpensesPage() {
  const { groupId } = useParams<{ groupId: string }>();
  const navigate = useNavigate();
  const [filters, setFilters] = useState<{
    memberId?: string;
    categoryId?: string;
  }>({});
  const [expenseToDelete, setExpenseToDelete] = useState<string | null>(null);

  const { data: summary, refresh: refreshSummary } = useDashboardSummary(
    groupId ?? null,
  );
  const { data: categories } = useCategoriesList(groupId ?? null);
  const {
    data: expensesList,
    loading,
    refresh: refreshExpenses,
  } = useExpensesList(
    groupId ?? null,
    filters.categoryId,
    filters.memberId,
    50,
  );

  const handleDeleteExpense = async (id: string) => {
    try {
      await expenseApi.delete(id);
      refreshExpenses();
      refreshSummary();
      setExpenseToDelete(null);
    } catch (err) {
      console.error("Failed to delete expense", err);
    }
  };

  return (
    <div className="p-4 md:p-8 max-w-7xl mx-auto space-y-8">
      <header className="flex items-center gap-4">
        <button
          onClick={() => {
            void navigate(-1);
          }}
          aria-label="Back to Dashboard"
          className="p-2 hover:bg-slate-200 dark:hover:bg-slate-800 rounded-xl transition-all hover:scale-105 active:scale-95 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm"
        >
          <ArrowLeft size={24} className="text-brand-balance" />
        </button>
        <div>
          <h1 className="text-3xl font-bold text-slate-900 dark:text-white">
            Expenses
          </h1>
          <p className="text-slate-500">
            View and filter all expenses for {summary?.groupName}
          </p>
        </div>
      </header>

      <ExpenseFilter
        onFilterChange={setFilters}
        members={summary?.members ?? []}
        categories={categories}
      />

      <LoadingCard
        loading={loading}
        isEmpty={expensesList === null || expensesList.expenses.length === 0}
        emptyMessage="No expenses found matching filters."
      >
        {expensesList?.expenses.map((expense) => (
          <div
            key={expense.id}
            className="py-4 flex items-center gap-4 first:pt-0 last:pb-0"
          >
            <div className="p-3 bg-brand-expense/10 text-brand-expense rounded-xl">
              <Receipt size={20} />
            </div>
            <div className="flex-1">
              <div className="flex justify-between">
                <span className="font-semibold text-slate-900 dark:text-white">
                  {expense.description}
                </span>
                <div className="flex items-center gap-4">
                  <span className="font-bold text-slate-900 dark:text-white font-mono tnum">
                    {formatCurrency(expense.amount)}
                  </span>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="text-slate-400 hover:text-destructive p-2 h-auto"
                    onClick={() => {
                      setExpenseToDelete(expense.id);
                    }}
                  >
                    <Trash2 size={16} />
                  </Button>
                </div>
              </div>
              <div className="flex justify-between text-sm text-slate-500">
                <span>{new Date(expense.date).toLocaleDateString()}</span>
                <span>
                  Member: {expense.payerName} • {expense.categoryName}
                </span>
              </div>
            </div>
          </div>
        ))}
      </LoadingCard>

      <Dialog
        open={expenseToDelete !== null}
        onOpenChange={(open) => {
          if (!open) setExpenseToDelete(null);
        }}
        title="Delete Expense"
        description="Are you sure you want to delete this expense? This action cannot be undone."
      >
        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => {
              setExpenseToDelete(null);
            }}
          >
            Cancel
          </Button>
          <Button
            className="bg-brand-expense hover:opacity-90"
            onClick={() => {
              if (expenseToDelete) void handleDeleteExpense(expenseToDelete);
            }}
          >
            Delete Expense
          </Button>
        </DialogFooter>
      </Dialog>
    </div>
  );
}
