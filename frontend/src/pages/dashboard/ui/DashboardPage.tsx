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
import { useSetActiveGroup } from "../../../app/providers/ActiveGroupContext";
import { ArrowLeft, Plus } from "lucide-react";
import { useAuth } from "../../../app/providers/AuthContext";
import { apiClient } from "../../../shared/api/client";
import { Button } from "../../../shared/ui";
import { Avatar, AvatarGroup } from "../../../shared/ui/Avatar";
import { Dialog } from "../../../shared/ui/Dialog";

/**
 * Builds the stable per-group member colour index (memberId → palette index)
 * from join order. Computed once and threaded into every widget so one person
 * keeps one colour + initial across the whole dashboard. Members arrive already
 * ordered by join order, so the index is simply array position.
 *
 * Later issues (expenses, transfers, categories) reuse this map to colour the
 * same members consistently.
 */
export function buildMemberColorIndex(
  members: { id: string }[],
): Map<string, number> {
  return new Map(members.map((m, i) => [m.id, i]));
}

export function DashboardPage() {
  const { user } = useAuth();
  const { groupId } = useParams<{ groupId: string }>();
  useSetActiveGroup(groupId);
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

  // Stable member colour index (memberId → palette index), computed once and
  // threaded into the widgets so a member's colour + initial is consistent
  // everywhere. See ADR 0007 "Stable member colour index, threaded app-wide".
  const memberColorIndex = buildMemberColorIndex(summary.members);

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
        <div className="flex items-center gap-3">
          <Link
            to="/groups"
            className="p-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 transition-colors rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800"
            aria-label="Back to groups"
          >
            <ArrowLeft size={20} />
          </Link>
          <div>
            <h1 className="text-3xl font-semibold text-slate-900 dark:text-white">
              {summary.groupName}
            </h1>
            <p className="text-slate-500">
              Shared budget · {summary.members.length} members
            </p>
          </div>
        </div>

        <div className="flex items-center gap-4">
          {summary.members.length > 0 && (
            <AvatarGroup max={4} size="sm">
              {summary.members.map((m) => (
                <Avatar
                  key={m.id}
                  size="sm"
                  name={m.name}
                  colorIndex={memberColorIndex.get(m.id) ?? 0}
                />
              ))}
            </AvatarGroup>
          )}
          <Button
            variant="expense"
            onClick={() => {
              setCreateExpenseOpen(true);
            }}
          >
            <Plus size={16} className="mr-1" />
            Add Expense
          </Button>
        </div>
      </header>

      <Dialog
        open={createExpenseOpen}
        onOpenChange={setCreateExpenseOpen}
        title="Add Expense"
        description="Log a spend against a category and the member who paid."
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
            members={summary.members.map((m) => ({
              ...m,
              colorIndex: memberColorIndex.get(m.id) ?? 0,
            }))}
          />
          <RemainingBalance
            totalRemaining={summary.totalIncome - summary.totalBudget}
            members={summary.members.map((m) => ({
              ...m,
              colorIndex: memberColorIndex.get(m.id) ?? 0,
            }))}
          />
          <RecentExpenses
            expenses={summary.recentExpenses}
            groupId={groupId ?? ""}
            members={summary.members.map((m) => ({
              id: m.id,
              name: m.name,
              colorIndex: memberColorIndex.get(m.id) ?? 0,
            }))}
            categories={categories}
          />
          <BudgetTransfers
            transfers={summary.recentTransfers}
            members={summary.members.map((m) => ({
              id: m.id,
              name: m.name,
              colorIndex: memberColorIndex.get(m.id) ?? 0,
            }))}
          />
        </div>

        <BudgetCategories
          categories={categories}
          isOwner={isOwner}
          onDelete={(id) => {
            void handleDeleteCategory(id);
          }}
          groupId={groupId ?? ""}
          members={summary.members.map((m, i) => ({
            id: m.id,
            name: m.name,
            income: m.income,
            share: m.share,
            index: i,
          }))}
          onRefresh={handleRefresh}
        />
      </div>
    </div>
  );
}
