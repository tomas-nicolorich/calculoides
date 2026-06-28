import { useState } from "react";
import { formatCurrency } from "../../../shared/api/dashboardUtils";
import {
  useExpensesList,
  useDashboardSummary,
  useCategoriesList,
} from "../../../shared/api/dashboardHooks";
import { ExpenseForm } from "../../../features/expense/ExpenseForm";
import { useParams, useNavigate } from "react-router-dom";
import { useAuth } from "../../../app/providers/AuthContext";
import { useSetActiveGroup } from "../../../app/providers/ActiveGroupContext";
import {
  ArrowLeft,
  ChevronLeft,
  ChevronRight,
  Info,
  Plus,
  Receipt,
  SlidersHorizontal,
  X,
} from "lucide-react";
import { expenseApi } from "../../../entities/expense";
import { Button, Card, IconButton, RowMenu, Select } from "../../../shared/ui";
import { Dialog, DialogFooter } from "../../../shared/ui/Dialog";
import { useIsMobile } from "../../../shared/lib/hooks/useIsMobile";
import type { ExpensesList } from "../../../../../shared/src/types/redesign";
import { CategoryIconTile } from "../../../shared/lib/categoryIcons";
import { Avatar } from "../../../shared/ui/Avatar";

// fallow-ignore-next-line complexity
export function ExpensesPage() {
  const { user } = useAuth();
  const { groupId } = useParams<{ groupId: string }>();
  useSetActiveGroup(groupId);
  const navigate = useNavigate();
  const PAGE_SIZE = 25;
  const isMobile = useIsMobile();

  const [memberId, setMemberId] = useState("");
  const [categoryFilterId, setCategoryFilterId] = useState("");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [showFilters, setShowFilters] = useState(false);
  const [offset, setOffset] = useState(0);

  const [expenseToDelete, setExpenseToDelete] = useState<string | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [expenseToEdit, setExpenseToEdit] = useState<
    ExpensesList["expenses"][number] | null
  >(null);

  const {
    data: summary,
    loading: summaryLoading,
    refresh: refreshSummary,
  } = useDashboardSummary(groupId ?? null);

  const { data: categories } = useCategoriesList(groupId ?? null);
  const {
    data: expensesList,
    loading,
    refresh: refreshExpenses,
  } = useExpensesList(
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
      await expenseApi.delete(id);
      refreshExpenses();
      refreshSummary();
      setExpenseToDelete(null);
    } catch (err) {
      console.error("Failed to delete expense", err);
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

  return (
    <div className="p-4 md:p-8 max-w-7xl mx-auto space-y-8">
      <header className="flex items-start justify-between gap-4 flex-wrap">
        <div className="flex items-center gap-4">
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
          <div>
            <h1 className="text-3xl font-semibold tracking-tight text-slate-900 dark:text-white">
              All Expenses
            </h1>
            <p className="text-sm text-slate-500 mt-1">
              Every recorded spend for this group
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
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
            variant="expense"
            disabled={!summary}
            onClick={() => {
              setExpenseToEdit(null);
              setDialogOpen(true);
            }}
          >
            <Plus size={16} className="mr-1" />
            Add Expense
          </Button>
        </div>
      </header>

      <Dialog
        open={dialogOpen}
        onOpenChange={(open) => {
          setDialogOpen(open);
          if (!open) setExpenseToEdit(null);
        }}
        title={expenseToEdit ? "Edit Expense" : "Add Expense"}
        description={
          expenseToEdit
            ? "Update the details of this spend."
            : "Record a spend and assign it to the member who paid."
        }
      >
        <ExpenseForm
          groupId={groupId ?? ""}
          categories={categories}
          members={summary?.members ?? []}
          defaultPayerId={
            summary?.members.find((m) => m.userId === user?.id)?.id
          }
          expense={expenseToEdit ?? undefined}
          onSuccess={() => {
            setDialogOpen(false);
            setExpenseToEdit(null);
            refreshExpenses();
            refreshSummary();
          }}
          onCancel={() => {
            setDialogOpen(false);
            setExpenseToEdit(null);
          }}
          onDelete={
            isMobile && expenseToEdit
              ? () => {
                  setDialogOpen(false);
                  setExpenseToDelete(expenseToEdit.id);
                  setExpenseToEdit(null);
                }
              : undefined
          }
        />
      </Dialog>

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
              <input
                type="date"
                value={from}
                onChange={(e) => {
                  setFrom(e.target.value);
                  setOffset(0);
                }}
                className="w-full border border-slate-200 dark:border-slate-700 rounded-lg px-2.5 py-1.5 text-sm bg-white dark:bg-slate-900 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-brand-balance"
              />
            </div>
            <div>
              <span className="block text-xs font-medium text-slate-500 mb-1.5">
                To
              </span>
              <input
                type="date"
                value={to}
                onChange={(e) => {
                  setTo(e.target.value);
                  setOffset(0);
                }}
                className="w-full border border-slate-200 dark:border-slate-700 rounded-lg px-2.5 py-1.5 text-sm bg-white dark:bg-slate-900 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-brand-balance"
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
          <p className="flex items-center gap-1.5 text-xs text-slate-400 mb-3">
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
            <div className="py-12 flex justify-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-brand-balance" />
            </div>
          ) : expenses.length === 0 ? (
            <div className="py-12 text-center text-sm text-slate-400">
              No expenses match these filters.
            </div>
          ) : (
            // fallow-ignore-next-line complexity
            expenses.map((expense) => {
              const rowClick =
                mode === "tap"
                  ? () => {
                      setExpenseToEdit(expense);
                      setDialogOpen(true);
                    }
                  : undefined;
              const rowKeyDown =
                mode === "tap"
                  ? (e: React.KeyboardEvent) => {
                      if (e.key === "Enter") {
                        setExpenseToEdit(expense);
                        setDialogOpen(true);
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
                        <div className="font-mono tabular-nums text-xs text-slate-400 mt-0.5">
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
                        setExpenseToEdit(expense);
                        setDialogOpen(true);
                      }}
                      onDelete={() => {
                        setExpenseToDelete(expense.id);
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
