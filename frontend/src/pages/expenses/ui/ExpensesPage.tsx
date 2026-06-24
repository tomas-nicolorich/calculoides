import { useState } from "react";
import { LoadingCard } from "../../../shared/ui/LoadingCard";
import { formatCurrency } from "../../../shared/api/dashboardUtils";
import {
  useExpensesList,
  useDashboardSummary,
  useCategoriesList,
} from "../../../shared/api/dashboardHooks";
import { ExpenseFilter } from "../../../features/expense-filtering/ui/ExpenseFilter";
import { ExpenseForm } from "../../../features/expense/ExpenseForm";
import { useParams, useNavigate } from "react-router-dom";
import { useAuth } from "../../../app/providers/AuthContext";
import { useSetActiveGroup } from "../../../app/providers/ActiveGroupContext";
import { ArrowLeft, Plus, Receipt, Trash2 } from "lucide-react";
import { expenseApi } from "../../../entities/expense";
import { Button, IconButton } from "../../../shared/ui";
import { Dialog, DialogFooter } from "../../../shared/ui/Dialog";

export function ExpensesPage() {
  const { user } = useAuth();
  const { groupId } = useParams<{ groupId: string }>();
  useSetActiveGroup(groupId);
  const navigate = useNavigate();
  const [filters, setFilters] = useState<{
    memberId?: string;
    categoryId?: string;
  }>({});
  const [expenseToDelete, setExpenseToDelete] = useState<string | null>(null);
  const [createOpen, setCreateOpen] = useState(false);

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
        <IconButton
          bordered
          hover="balance"
          onClick={() => {
            void navigate(-1);
          }}
          aria-label="Back to Dashboard"
        >
          <ArrowLeft size={20} />
        </IconButton>
        <div className="flex-1">
          <h1 className="text-3xl font-bold text-slate-900 dark:text-white">
            Expenses
          </h1>
          <p className="text-slate-500">
            View and filter all expenses for {summary?.groupName}
          </p>
        </div>
        <Button
          variant="expense"
          disabled={!summary}
          onClick={() => {
            setCreateOpen(true);
          }}
        >
          <Plus size={16} className="mr-1" />
          Add Expense
        </Button>
      </header>

      <Dialog
        open={createOpen}
        onOpenChange={setCreateOpen}
        title="Add Expense"
        description="Log a spend against a category and the member who paid."
      >
        <ExpenseForm
          groupId={groupId ?? ""}
          categories={categories}
          members={summary?.members ?? []}
          defaultPayerId={
            summary?.members.find((m) => m.userId === user?.id)?.id
          }
          onSuccess={() => {
            setCreateOpen(false);
            refreshExpenses();
          }}
          onCancel={() => {
            setCreateOpen(false);
          }}
        />
      </Dialog>

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
                  <IconButton
                    hover="expense"
                    size="sm"
                    onClick={() => {
                      setExpenseToDelete(expense.id);
                    }}
                  >
                    <Trash2 size={16} />
                  </IconButton>
                </div>
              </div>
              <div className="flex justify-between text-sm text-slate-500">
                <span>
                  {new Date(expense.date).toLocaleDateString("en-GB")}
                </span>
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
            variant="expense"
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
