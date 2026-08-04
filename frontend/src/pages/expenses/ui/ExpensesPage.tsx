import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { formatCurrency } from "../../../shared/api/dashboardUtils";
import {
  useExpensesList,
  useDashboardSummary,
  useCategoriesList,
} from "../../../shared/api/dashboardHooks";
import { ExpenseForm } from "../../../features/expense/ExpenseForm";
import { useParams } from "react-router-dom";
import { useAuth } from "../../../app/providers/AuthContext";
import { useSetActiveGroup } from "../../../app/providers/ActiveGroupContext";
import {
  ChevronLeft,
  ChevronRight,
  Info,
  Plus,
  Receipt,
  SlidersHorizontal,
  Trash2,
  X,
} from "lucide-react";
import { expenseApi } from "../../../entities/expense";
import { queryKeys } from "../../../shared/api/queryKeys";
import { toErrorMessage } from "../../../shared/api/toErrorMessage";
import {
  AddExpenseFab,
  Button,
  Card,
  DatePicker,
  IconButton,
  Input,
  ReloadButton,
  ResponsiveDialog,
  RowMenu,
  Select,
  Skeleton,
} from "../../../shared/ui";
import { DialogFooter } from "../../../shared/ui/Dialog";
import { useIsMobile } from "../../../shared/lib/hooks/useIsMobile";
import type { ExpensesList } from "../../../../../shared/src/types/redesign";
import { CategoryIconTile } from "../../../shared/lib/categoryIcons";
import { Avatar } from "../../../shared/ui/Avatar";

type ExpenseDialogState =
  | { mode: "closed" }
  | { mode: "form"; expense: ExpensesList["expenses"][number] | null }
  | { mode: "delete"; expense: ExpensesList["expenses"][number] };

// fallow-ignore-next-line complexity
export function ExpensesPage() {
  const { user } = useAuth();
  const { groupId } = useParams<{ groupId: string }>();
  useSetActiveGroup(groupId);
  const PAGE_SIZE = 25;
  const isMobile = useIsMobile();

  const [memberId, setMemberId] = useState("");
  const [categoryFilterId, setCategoryFilterId] = useState("");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [showFilters, setShowFilters] = useState(false);
  const [offset, setOffset] = useState(0);

  const [expenseDialog, setExpenseDialog] = useState<ExpenseDialogState>({
    mode: "closed",
  });
  const [deleteAllOpen, setDeleteAllOpen] = useState(false);
  const [deleteAllConfirmText, setDeleteAllConfirmText] = useState("");
  const qc = useQueryClient();
  const invalidateGroup = () =>
    qc.invalidateQueries({ queryKey: queryKeys.group(groupId ?? "") });

  const deleteExpense = useMutation({
    mutationFn: (id: string) => expenseApi.delete(id),
    onSuccess: invalidateGroup,
  });
  const deleteAllExpenses = useMutation({
    mutationFn: (groupId: string) => expenseApi.deleteAll(groupId),
    onSuccess: invalidateGroup,
  });
  const deleting = deleteExpense.isPending || deleteAllExpenses.isPending;
  const deleteError = toErrorMessage(
    deleteExpense.error ?? deleteAllExpenses.error,
  );

  const closeExpenseDialog = () => {
    setExpenseDialog({ mode: "closed" });
    deleteExpense.reset();
  };

  const { data: summary, loading: summaryLoading } = useDashboardSummary(
    groupId ?? null,
  );

  const { data: categories } = useCategoriesList(groupId ?? null);
  const { data: expensesList, loading } = useExpensesList(
    groupId ?? null,
    categoryFilterId || undefined,
    memberId || undefined,
    PAGE_SIZE,
    offset,
    from || undefined,
    to || undefined,
  );

  const handleDeleteExpense = async (id: string) => {
    try {
      await deleteExpense.mutateAsync(id);
      closeExpenseDialog();
    } catch {
      // deleteError derives from deleteExpense.error above.
    }
  };

  const handleDeleteAllExpenses = async () => {
    if (!groupId) return;
    try {
      await deleteAllExpenses.mutateAsync(groupId);
      setDeleteAllOpen(false);
      setDeleteAllConfirmText("");
    } catch {
      // deleteError derives from deleteAllExpenses.error above.
    }
  };

  const activeFilterCount = [memberId, categoryFilterId, from, to].filter(
    Boolean,
  ).length;

  const clearFilters = () => {
    setMemberId("");
    setCategoryFilterId("");
    setFrom("");
    setTo("");
    setOffset(0);
  };

  const expenses = expensesList?.expenses ?? [];
  const totalCount = expensesList?.pagination.total ?? 0;
  const pageTotal = expenses.reduce((s, e) => s + e.amount, 0);

  const memberOpts = [
    { value: "", label: "All members" },
    ...(summary?.members ?? []).map((m) => ({ value: m.id, label: m.name })),
  ];
  const catOpts = [
    { value: "", label: "All categories" },
    ...categories.map((c) => ({ value: c.id, label: c.name })),
  ];

  const mode = isMobile ? "tap" : "menu";

  const memberColorIndex = new Map(
    (summary?.members ?? []).map((m, i) => [m.id, i]),
  );
  const members = (summary?.members ?? []).map((m) => ({
    ...m,
    colorIndex: memberColorIndex.get(m.id),
  }));

  if (!summaryLoading && !summary) {
    return (
      <div className="p-8 text-center text-slate-500">
        No dashboard data available. Please select a group.
      </div>
    );
  }

  const editingExpense =
    expenseDialog.mode === "form" ? expenseDialog.expense : null;

  return (
    <div className="p-4 md:p-8 max-w-7xl mx-auto space-y-8">
      <header className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-3xl font-semibold tracking-tight text-slate-900 dark:text-white">
            All Expenses
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            Every recorded spend for this group
          </p>
        </div>
        <div className="flex items-center gap-2 flex-wrap w-full sm:w-auto">
          <ReloadButton queryKey={queryKeys.group(groupId ?? "")} />
          <Button
            variant="outline"
            onClick={() => {
              setShowFilters((s) => !s);
            }}
          >
            <SlidersHorizontal size={16} className="mr-1.5" />
            {showFilters ? "Hide Filters" : "Filters"}
            {activeFilterCount > 0 ? ` (${activeFilterCount.toString()})` : ""}
          </Button>
          <Button
            variant="outline"
            disabled={!summary || expenses.length === 0}
            onClick={() => {
              setDeleteAllOpen(true);
              deleteAllExpenses.reset();
            }}
          >
            <Trash2 size={16} className="mr-1.5" />
            Delete All
          </Button>
          {!isMobile && (
            <Button
              variant="cta"
              disabled={!summary}
              onClick={() => {
                setExpenseDialog({ mode: "form", expense: null });
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
          disabled={!summary}
          onClick={() => {
            setExpenseDialog({ mode: "form", expense: null });
          }}
        />
      )}

      <ResponsiveDialog
        open={expenseDialog.mode !== "closed"}
        onOpenChange={(open) => {
          if (!open) closeExpenseDialog();
        }}
        title={
          expenseDialog.mode === "delete"
            ? "Delete Expense"
            : editingExpense
              ? "Edit Expense"
              : "Add Expense"
        }
        description={
          expenseDialog.mode === "delete"
            ? `Delete "${expenseDialog.expense.description}" (${formatCurrency(expenseDialog.expense.amount)})? This action cannot be undone.`
            : editingExpense
              ? "Update the details of this spend."
              : "Record a spend and assign it to the member who paid."
        }
      >
        {expenseDialog.mode === "delete" ? (
          <>
            {deleteError && (
              <div className="text-xs font-medium text-brand-expense bg-brand-expense/5 dark:bg-brand-expense/10 dark:text-red-400 p-2.5 rounded-lg border border-brand-expense/20 dark:border-red-900/30">
                {deleteError}
              </div>
            )}
            <DialogFooter destructive>
              <Button
                variant="outline"
                disabled={deleting}
                onClick={closeExpenseDialog}
              >
                Cancel
              </Button>
              <Button
                variant="expense"
                disabled={deleting}
                onClick={() => {
                  void handleDeleteExpense(expenseDialog.expense.id);
                }}
              >
                {deleting ? "Deleting…" : "Delete Expense"}
              </Button>
            </DialogFooter>
          </>
        ) : (
          <ExpenseForm
            key={editingExpense?.id ?? "new"}
            groupId={groupId ?? ""}
            categories={categories}
            members={summary?.members ?? []}
            defaultPayerId={
              summary?.members.find((m) => m.userId === user?.id)?.id
            }
            expense={editingExpense ?? undefined}
            onSuccess={() => {
              closeExpenseDialog();
            }}
            onCancel={closeExpenseDialog}
            onDelete={
              isMobile && editingExpense
                ? () => {
                    deleteExpense.reset();
                    setExpenseDialog({
                      mode: "delete",
                      expense: editingExpense,
                    });
                  }
                : undefined
            }
          />
        )}
      </ResponsiveDialog>

      <Card>
        {showFilters && (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-3">
            <div>
              <span className="block text-xs font-medium text-slate-500 mb-1.5">
                Member
              </span>
              <Select
                value={memberId}
                onValueChange={(v) => {
                  setMemberId(v);
                  setOffset(0);
                }}
                options={memberOpts}
              />
            </div>
            <div>
              <span className="block text-xs font-medium text-slate-500 mb-1.5">
                Category
              </span>
              <Select
                value={categoryFilterId}
                onValueChange={(v) => {
                  setCategoryFilterId(v);
                  setOffset(0);
                }}
                options={catOpts}
              />
            </div>
            <div>
              <span className="block text-xs font-medium text-slate-500 mb-1.5">
                From
              </span>
              <DatePicker
                value={from}
                onChange={(v) => {
                  setFrom(v);
                  setOffset(0);
                }}
                granularity="day"
                placeholder="Any date"
              />
            </div>
            <div>
              <span className="block text-xs font-medium text-slate-500 mb-1.5">
                To
              </span>
              <DatePicker
                value={to}
                onChange={(v) => {
                  setTo(v);
                  setOffset(0);
                }}
                granularity="day"
                placeholder="Any date"
              />
            </div>
            {activeFilterCount > 0 && (
              <div className="col-span-2 md:col-span-4 flex justify-end">
                <Button variant="ghost" size="sm" onClick={clearFilters}>
                  <X size={13} className="mr-1" /> Clear filters
                </Button>
              </div>
            )}
          </div>
        )}

        <div
          className={`flex items-center justify-between text-sm pb-2 mb-2 ${showFilters ? "pt-2" : "pt-0"}`}
        >
          <span className="text-slate-500">
            Showing{" "}
            <strong className="font-semibold text-slate-900 dark:text-white">
              {expenses.length.toString()}
            </strong>{" "}
            of {totalCount.toString()} expenses
          </span>
          <span className="text-slate-500">
            Total{" "}
            <strong className="font-semibold text-slate-900 dark:text-white font-mono tabular-nums">
              {formatCurrency(pageTotal)}
            </strong>
          </span>
        </div>

        {isMobile && expenses.length > 0 && (
          <p className="flex items-center gap-1.5 text-xs text-slate-500 dark:text-slate-400 mb-3">
            <Info size={13} /> Tap any expense to edit it.
          </p>
        )}

        <div
          className={
            isMobile
              ? "-mx-6 border-t border-slate-100 dark:border-slate-800"
              : "rounded-2xl border border-slate-100 dark:border-slate-800 overflow-hidden"
          }
        >
          {!isMobile && (
            <div className="grid grid-cols-[2.2fr_1.4fr_1.4fr_1fr_64px] gap-4 items-center px-5 py-3 bg-slate-50 dark:bg-slate-800/50 border-b border-slate-100 dark:border-slate-800">
              <span className="text-[11px] font-semibold uppercase tracking-widest text-slate-400 dark:text-slate-500">
                Expense
              </span>
              <span className="text-[11px] font-semibold uppercase tracking-widest text-slate-400 dark:text-slate-500">
                Category
              </span>
              <span className="text-[11px] font-semibold uppercase tracking-widest text-slate-400 dark:text-slate-500">
                Payer
              </span>
              <span className="text-[11px] font-semibold uppercase tracking-widest text-slate-400 dark:text-slate-500 text-right">
                Amount
              </span>
              <span />
            </div>
          )}

          {loading || expensesList === null ? (
            <div aria-hidden="true">
              {Array.from({ length: 6 }, (_, i) =>
                isMobile ? (
                  <div
                    key={i}
                    className="px-6 py-3.5 border-b border-slate-100 dark:border-slate-800 last:border-b-0"
                  >
                    <div className="flex items-center gap-3">
                      <Skeleton className="h-9.5 w-9.5 rounded-lg" />
                      <div className="min-w-0 flex-1 flex flex-col gap-2">
                        <Skeleton className="h-4 w-32" />
                        <Skeleton className="h-3 w-20" />
                      </div>
                      <Skeleton className="h-4 w-14" />
                    </div>
                  </div>
                ) : (
                  <div
                    key={i}
                    className="grid grid-cols-[2.2fr_1.4fr_1.4fr_1fr_64px] items-center px-5 py-3 gap-4 border-b border-slate-100 dark:border-slate-800 last:border-b-0"
                  >
                    <div className="flex items-center gap-3">
                      <Skeleton className="h-[38px] w-[38px] rounded-lg" />
                      <Skeleton className="h-4 w-32" />
                    </div>
                    <Skeleton className="h-4 w-20" />
                    <Skeleton className="h-4 w-20" />
                    <Skeleton className="h-4 w-16 justify-self-end" />
                    <div />
                  </div>
                ),
              )}
            </div>
          ) : expenses.length === 0 ? (
            <div className="py-12 flex flex-col items-center gap-3 text-center text-sm text-slate-400">
              {activeFilterCount > 0 ? (
                <>
                  <p>No expenses match these filters.</p>
                  <Button variant="ghost" size="sm" onClick={clearFilters}>
                    <X size={13} className="mr-1" /> Clear filters
                  </Button>
                </>
              ) : (
                <>
                  <p>No expenses logged yet for this group.</p>
                  <Button
                    variant="cta"
                    size="sm"
                    disabled={!summary}
                    onClick={() => {
                      setExpenseDialog({ mode: "form", expense: null });
                    }}
                  >
                    <Plus size={16} className="mr-1" />
                    Add your first expense
                  </Button>
                </>
              )}
            </div>
          ) : (
            // fallow-ignore-next-line complexity
            expenses.map((expense) => {
              const rowClick =
                mode === "tap"
                  ? () => {
                      setExpenseDialog({ mode: "form", expense });
                    }
                  : undefined;
              const rowKeyDown =
                mode === "tap"
                  ? (e: React.KeyboardEvent) => {
                      if (e.key === "Enter") {
                        setExpenseDialog({ mode: "form", expense });
                      }
                    }
                  : undefined;
              const member = members.find((m) => m.id == expense.payerId);
              const dateLabel = new Date(expense.date).toLocaleDateString(
                "en-GB",
                {
                  day: "2-digit",
                  month: "short",
                  year: "numeric",
                },
              );

              if (isMobile) {
                return (
                  <div
                    key={expense.id}
                    onClick={rowClick}
                    onKeyDown={rowKeyDown}
                    tabIndex={mode === "tap" ? 0 : undefined}
                    role={mode === "tap" ? "button" : undefined}
                    className="px-6 py-3.5 select-none outline-none cursor-pointer border-b border-slate-100 dark:border-slate-800 last:border-b-0 hover:bg-slate-50 dark:hover:bg-slate-800/40 transition-colors focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-brand-balance"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-9.5 h-9.5 flex-none rounded-lg bg-brand-expense/10 text-brand-expense grid place-items-center">
                        <Receipt size={16} />
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="text-sm font-medium text-slate-900 dark:text-white truncate">
                          {expense.description}
                        </div>
                        <div className="font-mono tabular-nums text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                          {dateLabel}
                        </div>
                      </div>
                      <div className="text-sm font-semibold font-mono tabular-nums text-slate-900 dark:text-white text-right">
                        {formatCurrency(expense.amount)}
                      </div>
                    </div>

                    <div className="flex items-center justify-between gap-3 mt-2.5">
                      <span className="inline-flex items-center gap-1.5 text-xs font-medium text-slate-500 dark:text-slate-300 min-w-0">
                        {expense.categoryIcon && (
                          <CategoryIconTile
                            icon={expense.categoryIcon}
                            size="2xs"
                          />
                        )}
                        <span className="truncate">{expense.categoryName}</span>
                      </span>
                      <span className="flex items-center gap-2 text-sm text-slate-600 dark:text-slate-300 flex-none">
                        <Avatar
                          name={member?.name}
                          colorIndex={member?.colorIndex}
                          size="xs"
                        />
                        {expense.payerName.split(" ")[0]}
                      </span>
                    </div>
                  </div>
                );
              }

              return (
                <div
                  key={expense.id}
                  onClick={rowClick}
                  onKeyDown={rowKeyDown}
                  tabIndex={mode === "tap" ? 0 : undefined}
                  role={mode === "tap" ? "button" : undefined}
                  className="grid grid-cols-[2.2fr_1.4fr_1.4fr_1fr_64px] items-center px-5 py-3 gap-4 select-none outline-none border-b border-slate-100 dark:border-slate-800 last:border-b-0 hover:bg-slate-50 dark:hover:bg-slate-800/40 transition-colors"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-[38px] h-[38px] flex-none rounded-lg bg-brand-expense/10 text-brand-expense grid place-items-center">
                      <Receipt size={16} />
                    </div>
                    <div className="min-w-0">
                      <div className="text-sm font-medium text-slate-900 dark:text-white truncate">
                        {expense.description}
                      </div>
                      <div className="font-mono tabular-nums text-xs text-slate-400 mt-0.5">
                        {dateLabel}
                      </div>
                    </div>
                  </div>

                  <div className="min-w-0">
                    <span className="inline-flex items-center gap-1.5 text-xs font-medium text-slate-600 dark:text-slate-300">
                      {expense.categoryIcon && (
                        <CategoryIconTile
                          icon={expense.categoryIcon}
                          size="2xs"
                        />
                      )}
                      <span className="truncate">{expense.categoryName}</span>
                    </span>
                  </div>

                  <div className="flex items-center gap-2 min-w-0 text-sm text-slate-600 dark:text-slate-300">
                    <Avatar
                      name={member?.name}
                      colorIndex={member?.colorIndex}
                      size="xs"
                    />
                    <span className="truncate">
                      {expense.payerName.split(" ")[0]}
                    </span>
                  </div>

                  <div className="text-sm font-semibold font-mono tabular-nums text-slate-900 dark:text-white text-right">
                    {formatCurrency(expense.amount)}
                  </div>

                  <div
                    className="flex justify-end"
                    onClick={(e) => {
                      e.stopPropagation();
                    }}
                  >
                    <RowMenu
                      onEdit={() => {
                        setExpenseDialog({ mode: "form", expense });
                      }}
                      onDelete={() => {
                        deleteExpense.reset();
                        setExpenseDialog({ mode: "delete", expense });
                      }}
                    />
                  </div>
                </div>
              );
            })
          )}
        </div>

        {totalCount > PAGE_SIZE && (
          <div className="flex items-center justify-between pt-4 mt-2 border-t border-slate-100 dark:border-slate-800 text-sm text-slate-500">
            <span>
              {(offset + 1).toString()}–
              {Math.min(offset + PAGE_SIZE, totalCount).toString()} of{" "}
              {totalCount.toString()}
            </span>
            <div className="flex items-center gap-2">
              <IconButton
                bordered
                hover="balance"
                size="sm"
                disabled={offset === 0}
                onClick={() => {
                  setOffset(Math.max(0, offset - PAGE_SIZE));
                }}
                aria-label="Previous page"
              >
                <ChevronLeft size={16} />
              </IconButton>
              <IconButton
                bordered
                hover="balance"
                size="sm"
                disabled={offset + PAGE_SIZE >= totalCount}
                onClick={() => {
                  setOffset(offset + PAGE_SIZE);
                }}
                aria-label="Next page"
              >
                <ChevronRight size={16} />
              </IconButton>
            </div>
          </div>
        )}
      </Card>

      <ResponsiveDialog
        open={deleteAllOpen}
        onOpenChange={(open) => {
          setDeleteAllOpen(open);
          if (!open) {
            setDeleteAllConfirmText("");
            deleteAllExpenses.reset();
          }
        }}
        title="Delete All Expenses"
        description="This will permanently delete every expense in this group, regardless of any active filters. This action cannot be undone."
      >
        <div className="space-y-2">
          <label className="text-sm font-medium">
            Type <span className="font-mono font-semibold">DELETE</span> to
            confirm
          </label>
          <Input
            value={deleteAllConfirmText}
            onChange={(e) => {
              setDeleteAllConfirmText(e.target.value);
            }}
            placeholder="DELETE"
            autoComplete="off"
          />
        </div>
        {deleteError && (
          <div className="mt-3 text-xs font-medium text-brand-expense bg-brand-expense/5 dark:bg-brand-expense/10 dark:text-red-400 p-2.5 rounded-lg border border-brand-expense/20 dark:border-red-900/30">
            {deleteError}
          </div>
        )}
        <DialogFooter destructive>
          <Button
            variant="outline"
            disabled={deleting}
            onClick={() => {
              setDeleteAllOpen(false);
              setDeleteAllConfirmText("");
              deleteAllExpenses.reset();
            }}
          >
            Cancel
          </Button>
          <Button
            variant="expense"
            disabled={deleting || deleteAllConfirmText.trim() !== "DELETE"}
            onClick={() => void handleDeleteAllExpenses()}
          >
            {deleting ? "Deleting…" : "Delete All Expenses"}
          </Button>
        </DialogFooter>
      </ResponsiveDialog>
    </div>
  );
}
