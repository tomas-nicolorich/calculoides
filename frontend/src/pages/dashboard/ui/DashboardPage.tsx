import { useState } from "react";
import {
  useDashboardSummary,
  useCategoriesList,
} from "../../../shared/api/dashboardHooks";
import { IncomeOverview } from "../../../widgets/dashboard/ui/IncomeOverview";
import { RemainingBalance } from "../../../widgets/dashboard/ui/RemainingBalance";
import { BudgetCategories } from "../../../widgets/dashboard/ui/BudgetCategories";
import { BudgetTransfers } from "../../../widgets/dashboard/ui/BudgetTransfers";
import { RecentExpenses } from "../../../widgets/dashboard/ui/RecentExpenses";
import { ExpenseForm } from "../../../features/expense/ExpenseForm";
import { Link, useParams } from "react-router-dom";
import { Calculator, Plus } from "lucide-react";
import { useAuth } from "../../../app/providers/AuthContext";
import { apiClient } from "../../../shared/api/client";
import { Button } from "../../../shared/ui";
import { Dialog } from "../../../shared/ui/Dialog";

export function DashboardPage() {
  const { user } = useAuth();
  const { groupId } = useParams<{ groupId: string }>();
  const {
    data: summary,
    loading: summaryLoading,
    error: summaryError,
    refresh: refreshSummary,
  } = useDashboardSummary(groupId ?? null);
  const {
    data: categories,
    loading: categoriesLoading,
    error: categoriesError,
    refresh: refreshCategories,
  } = useCategoriesList(groupId ?? null);
  const [createExpenseOpen, setCreateExpenseOpen] = useState(false);

  if (summaryLoading || categoriesLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-brand-balance"></div>
      </div>
    );
  }

  if (summaryError || categoriesError) {
    return (
      <div className="p-8 text-center space-y-4">
        <p className="text-red-500 font-medium">
          Failed to load dashboard data
        </p>
        <p className="text-sm text-slate-500">
          {summaryError ?? categoriesError}
        </p>
        <button
          onClick={() => {
            refreshSummary();
            refreshCategories();
          }}
          className="px-4 py-2 bg-brand-balance text-white rounded-xl"
        >
          Retry
        </button>
      </div>
    );
  }

  if (!summary) {
    return (
      <div className="p-8 text-center text-slate-500">
        No dashboard data available. Please select a group.
      </div>
    );
  }

  const isOwner = user?.id === summary.ownerId;

  const handleDeleteCategory = async (id: string) => {
    try {
      await apiClient.fetch(`/transactions?action=category-delete&id=${id}`, {
        method: "DELETE",
      });
      refreshCategories();
      refreshSummary();
    } catch (err) {
      console.error("Failed to delete category", err);
      // Removed alert to comply with SC-006
    }
  };

  const handleRefresh = () => {
    refreshCategories();
    refreshSummary();
  };

  return (
    <div className="p-4 md:p-8 max-w-7xl mx-auto space-y-8">
      <header className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-semibold text-slate-900 dark:text-white">
            {summary.groupName}
          </h1>
          <p className="text-slate-500">Welcome back to your dashboard</p>
        </div>

        <div className="flex items-center gap-3">
          <Button
            variant="expense"
            onClick={() => {
              setCreateExpenseOpen(true);
            }}
          >
            <Plus size={16} className="mr-1" />
            Add Expense
          </Button>
          <Link
            to={`/savings/${groupId ?? ""}`}
            className="flex items-center justify-center gap-2 px-6 py-3 bg-brand-balance text-white rounded-2xl font-semibold shadow-lg shadow-brand-balance/20 hover:scale-[1.02] transition-transform active:scale-[0.98]"
          >
            <Calculator size={20} />
            <span>Savings Goal</span>
          </Link>
        </div>
      </header>

      <Dialog
        open={createExpenseOpen}
        onOpenChange={setCreateExpenseOpen}
        title="Log Expense"
        description="Record a new expense for your group."
      >
        <ExpenseForm
          groupId={groupId ?? ""}
          categories={categories}
          members={summary.members}
          defaultPayerId={
            summary.members.find((m) => m.userId === user?.id)?.id
          }
          onSuccess={() => {
            setCreateExpenseOpen(false);
            handleRefresh();
          }}
          onCancel={() => {
            setCreateExpenseOpen(false);
          }}
        />
      </Dialog>

      <div
        className="grid grid-cols-1 lg:grid-cols-2 3xl:grid-cols-3 gap-6 items-start"
        data-testid="dashboard-grid"
      >
        <div className="flex flex-col gap-6 3xl:col-span-2 3xl:grid 3xl:grid-cols-2">
          <IncomeOverview
            totalIncome={summary.totalIncome}
            members={summary.members}
          />
          <RemainingBalance
            totalRemaining={summary.totalIncome - summary.totalBudget}
            members={summary.members}
          />
          <RecentExpenses
            expenses={summary.recentExpenses}
            groupId={groupId ?? ""}
          />
          <BudgetTransfers transfers={summary.recentTransfers} />
        </div>

        <BudgetCategories
          categories={categories}
          isOwner={isOwner}
          onDelete={(id) => {
            void handleDeleteCategory(id);
          }}
          groupId={groupId ?? ""}
          members={summary.members.map((m) => ({ id: m.id, name: m.name }))}
          onRefresh={handleRefresh}
        />
      </div>
    </div>
  );
}
