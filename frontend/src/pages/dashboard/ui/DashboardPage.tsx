import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
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
import { useParams } from "react-router-dom";
import { useSetActiveGroup } from "../../../app/providers/ActiveGroupContext";
import { Plus } from "lucide-react";
import { useAuth } from "../../../app/providers/AuthContext";
import { categoryApi } from "../../../entities/category";
import { queryKeys } from "../../../shared/api/queryKeys";
import { toErrorMessage } from "../../../shared/api/toErrorMessage";
import { useIsMobile } from "../../../shared/lib/hooks/useIsMobile";
import {
  AddExpenseFab,
  Alert,
  Button,
  Card,
  ResponsiveDialog,
  Skeleton,
} from "../../../shared/ui";
import { Avatar, AvatarGroup } from "../../../shared/ui/Avatar";

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
  const isMobile = useIsMobile();
  const qc = useQueryClient();
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

  const deleteCategory = useMutation({
    mutationFn: (id: string) => categoryApi.delete(id),
    onSuccess: () =>
      qc.invalidateQueries({ queryKey: queryKeys.group(groupId ?? "") }),
  });
  const deleteCategoryError = toErrorMessage(deleteCategory.error);

  if (summaryLoading || categoriesLoading) {
    return (
      <div
        className="p-4 md:p-8 max-w-7xl mx-auto space-y-8"
        aria-hidden="true"
      >
        <header className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="space-y-2">
            <Skeleton className="h-7 w-48" />
            <Skeleton className="h-4 w-32" />
          </div>
          <div className="flex items-center gap-4">
            <Skeleton className="h-[34px] w-[34px] rounded-full" />
            <Skeleton className="h-9 w-36 rounded-md" />
          </div>
        </header>

        <div
          className="grid grid-cols-1 lg:grid-cols-2 3xl:grid-cols-3 gap-6 items-start"
          data-testid="dashboard-grid-skeleton"
        >
          <div className="flex flex-col gap-6 3xl:col-span-2 3xl:grid 3xl:grid-cols-2">
            {Array.from({ length: 4 }, (_, i) => (
              <Card key={i}>
                <Skeleton className="h-4 w-28 mb-4" />
                <Skeleton className="h-8 w-40 mb-6" />
                <Skeleton className="h-3 w-full mb-2" />
                <Skeleton className="h-3 w-5/6" />
              </Card>
            ))}
          </div>
          <Card>
            <Skeleton className="h-4 w-32 mb-4" />
            {Array.from({ length: 3 }, (_, i) => (
              <div key={i} className="flex items-center gap-3 py-3">
                <Skeleton className="h-9 w-9 rounded-xl" />
                <div className="flex-1 space-y-2">
                  <Skeleton className="h-3.5 w-24" />
                  <Skeleton className="h-2.5 w-full" />
                </div>
              </div>
            ))}
          </Card>
        </div>
      </div>
    );
  }

  if (summaryError || categoriesError) {
    return (
      <div className="p-8 text-center space-y-4">
        <p className="text-brand-expense font-medium">
          Failed to load dashboard data
        </p>
        <p className="text-sm text-slate-500">
          {summaryError ?? categoriesError}
        </p>
        <Button
          variant="balance"
          onClick={() => {
            refreshSummary();
            refreshCategories();
          }}
        >
          Retry
        </Button>
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
      await deleteCategory.mutateAsync(id);
    } catch {
      // deleteCategoryError derives from deleteCategory.error above.
    }
  };

  const handleRefresh = () => {
    refreshCategories();
    refreshSummary();
  };

  return (
    <div className="p-4 md:p-8 max-w-7xl mx-auto space-y-8">
      {deleteCategoryError && (
        <Alert
          action={{
            label: "Dismiss",
            onClick: () => {
              deleteCategory.reset();
            },
          }}
        >
          {deleteCategoryError}
        </Alert>
      )}

      <header className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-semibold text-slate-900 dark:text-white">
            {summary.groupName}
          </h1>
          <p className="text-slate-500">
            Shared budget · {summary.members.length} members
          </p>
        </div>

        <div className="flex items-center gap-4">
          {summary.members.length > 0 && (
            <AvatarGroup max={3} size="sm">
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
          {!isMobile && (
            <Button
              variant="cta"
              onClick={() => {
                setCreateExpenseOpen(true);
              }}
            >
              <Plus size={16} className="mr-1" />
              Add Expense
            </Button>
          )}
        </div>
      </header>

      {isMobile && (
        <AddExpenseFab
          onClick={() => {
            setCreateExpenseOpen(true);
          }}
        />
      )}

      <ResponsiveDialog
        open={createExpenseOpen}
        onOpenChange={setCreateExpenseOpen}
        title="Add Expense"
        description="Log a spend against a category and the member who paid."
        hideCloseButton
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
      </ResponsiveDialog>

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
            onRefresh={handleRefresh}
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
            groupId={groupId ?? ""}
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
        />
      </div>
    </div>
  );
}
