"use client";

import { useState } from "react";
import {
  Info,
  Plus,
  Receipt,
  SlidersHorizontal,
  Trash2,
  X,
} from "lucide-react";
import type {
  CategoryWithBalances,
  DashboardSummary,
  ExpensesList,
} from "shared/src/types/redesign";
import {
  useExpensesList,
  useDeleteExpense,
  useDeleteAllExpenses,
} from "../../../_data/expenses";
import { useDashboardSummary } from "../../../_data/summary";
import { useCategoriesList } from "../../../_data/categories";
import {
  AddExpenseFab,
  Avatar,
  Button,
  Card,
  CategoryIconTile,
  DatePicker,
  DialogFooter,
  Input,
  Pagination,
  ReloadButton,
  ResponsiveDialog,
  RowMenu,
  Select,
} from "../../../_ui";
import type { SelectOption } from "../../../../lib/select-options";
import { toSelectOptions } from "../../../../lib/select-options";
import { formatCurrency } from "../../../../lib/format-currency";
import { queryKeys } from "../../../../lib/query-keys";
import { ExpenseForm } from "./_components/ExpenseForm";
import {
  ExpensesRowsSkeletonMobile,
  ExpensesRowsSkeletonDesktop,
} from "./_skeletons";

type Expense = ExpensesList["expenses"][number];
type MemberWithColor = DashboardSummary["members"][number] & {
  colorIndex: number | undefined;
};
type ExpenseMember = { name: string; colorIndex?: number } | undefined;

type ExpenseDialogState =
  | { mode: "closed" }
  | { mode: "form"; expense: Expense | null }
  | { mode: "delete"; expense: Expense };

const PAGE_SIZE = 25;

function formatExpenseDate(date: string): string {
  return new Date(date).toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

/** Combines the two delete mutations' pending/error state into one pair,
 * same derivation `ExpensesClient` always did inline — moved to a pure
 * helper so it's not re-evaluated as branching inside the component body. */
function deriveDeletionStatus(
  a: { isPending: boolean; error: unknown },
  b: { isPending: boolean; error: unknown },
): { deleting: boolean; deleteError: string | null } {
  const deleting = a.isPending || b.isPending;
  const errorSource = a.error ?? b.error;
  return {
    deleting,
    deleteError: errorSource instanceof Error ? errorSource.message : null,
  };
}

/** Normalizes the paginated list response into always-defined `expenses`/`totalCount`. */
function derivePage(list: ExpensesList | undefined): {
  expenses: Expense[];
  totalCount: number;
} {
  return {
    expenses: list?.expenses ?? [],
    totalCount: list?.pagination.total ?? 0,
  };
}

/** Attaches each member's array position as `colorIndex` (avatar color slot),
 * same lookup `ExpensesClient` always did inline via a `Map`. */
function withMemberColors(
  members: DashboardSummary["members"] | undefined,
): MemberWithColor[] {
  const list = members ?? [];
  const colorIndex = new Map(list.map((m, i) => [m.id, i]));
  return list.map((m) => ({ ...m, colorIndex: colorIndex.get(m.id) }));
}

/** True when the "Delete All" action has something to do. */
function canDeleteAllExpenses(
  hasSummary: boolean,
  expenseCount: number,
): boolean {
  return hasSummary && expenseCount > 0;
}

/** Bundles the filter/pagination UI state (member, category, date range,
 * filter-panel visibility, page offset) behind one hook call so the
 * component only pays the hook-count "cost" once instead of once per
 * `useState`. Resetting to page 1 on every filter change is baked into
 * each setter, same as the inline `setOffset(0)` calls this replaces. */
function useExpensesFilters() {
  const [memberId, setMemberIdState] = useState("");
  const [categoryFilterId, setCategoryFilterIdState] = useState("");
  const [from, setFromState] = useState("");
  const [to, setToState] = useState("");
  const [showFilters, setShowFilters] = useState(false);
  const [offset, setOffset] = useState(0);

  const setMemberId = (value: string) => {
    setMemberIdState(value);
    setOffset(0);
  };
  const setCategoryFilterId = (value: string) => {
    setCategoryFilterIdState(value);
    setOffset(0);
  };
  const setFrom = (value: string) => {
    setFromState(value);
    setOffset(0);
  };
  const setTo = (value: string) => {
    setToState(value);
    setOffset(0);
  };

  const activeFilterCount = [memberId, categoryFilterId, from, to].filter(
    Boolean,
  ).length;

  const clearFilters = () => {
    setMemberIdState("");
    setCategoryFilterIdState("");
    setFromState("");
    setToState("");
    setOffset(0);
  };

  return {
    memberId,
    categoryFilterId,
    from,
    to,
    showFilters,
    offset,
    activeFilterCount,
    queryFilters: {
      categoryId: categoryFilterId || undefined,
      memberId: memberId || undefined,
      from: from || undefined,
      to: to || undefined,
    },
    setShowFilters,
    setMemberId,
    setCategoryFilterId,
    setFrom,
    setTo,
    setOffset,
    clearFilters,
  };
}

type ExpensesFilters = ReturnType<typeof useExpensesFilters>;

/**
 * Full port of `main`'s `frontend/src/pages/expenses/ui/ExpensesPage.tsx`
 * (filters, pagination, add/edit/delete, delete-all) — replaces the earlier
 * lean stub. Adapted to this repo's data seam: `groupId`/`currentUserId`
 * come as props (no react-router `useParams`/`useAuth`), list/mutation
 * hooks are the hoisted `app/_data/*` ones (`useExpensesList` takes a
 * filters object, mutations resolve `ActionResult` instead of throwing).
 *
 * DEVIATION (mandatory, ADR-3 —
 * `openspec/changes/archive/2026-08-18-nextjs-migration-ui-fixes/design.md`):
 * `main` picks mobile-vs-desktop markup with a JS `useIsMobile()` branch;
 * that hook is scoped to `ResponsiveDialog`/`DatePicker` only in this repo
 * to avoid an SSR hydration flash. Here both trees render unconditionally,
 * gated by Tailwind `md:hidden` / `hidden md:*`, same pattern as
 * `QuickAddExpense`'s FAB-vs-button split and the app shell's nav.
 *
 * Split into this data/handlers container plus the `ExpensesPageContent`
 * presenter: keeps every hook call and state transition in one place while
 * the markup (and its own small branches) lives in a function with its own,
 * separate complexity budget.
 */
export function ExpensesClient({
  groupId,
  currentUserId,
}: {
  groupId: string;
  currentUserId: string;
}) {
  const filters = useExpensesFilters();

  const [expenseDialog, setExpenseDialog] = useState<ExpenseDialogState>({
    mode: "closed",
  });
  const [deleteAllOpen, setDeleteAllOpen] = useState(false);
  const [deleteAllConfirmText, setDeleteAllConfirmText] = useState("");

  const deleteExpense = useDeleteExpense(groupId);
  const deleteAllExpenses = useDeleteAllExpenses(groupId);
  const { deleting, deleteError } = deriveDeletionStatus(
    deleteExpense,
    deleteAllExpenses,
  );

  const closeExpenseDialog = () => {
    setExpenseDialog({ mode: "closed" });
    deleteExpense.reset();
  };

  const openExpenseDialog = (expense: Expense | null) => {
    setExpenseDialog({ mode: "form", expense });
  };

  const requestDeleteExpense = (expense: Expense) => {
    deleteExpense.reset();
    setExpenseDialog({ mode: "delete", expense });
  };

  const { data: summary, isLoading: summaryLoading } =
    useDashboardSummary(groupId);
  const { data: categories } = useCategoriesList(groupId);
  const { data: expensesList, isLoading: loading } = useExpensesList(
    groupId,
    {
      ...filters.queryFilters,
      limit: PAGE_SIZE,
      offset: filters.offset,
    },
  );

  const handleDeleteExpense = async (id: string) => {
    try {
      await deleteExpense.mutateAsync({ expenseId: id });
      closeExpenseDialog();
    } catch {
      // deleteError derives from deleteExpense.error above.
    }
  };

  const handleDeleteAllExpenses = async () => {
    try {
      await deleteAllExpenses.mutateAsync({ groupId });
      setDeleteAllOpen(false);
      setDeleteAllConfirmText("");
    } catch {
      // deleteError derives from deleteAllExpenses.error above.
    }
  };

  const { expenses, totalCount } = derivePage(expensesList);
  const pageTotal = expenses.reduce((s, e) => s + e.amount, 0);
  const members = withMemberColors(summary?.members);
  const memberOpts = toSelectOptions(summary?.members, "All members");
  const catOpts = toSelectOptions(categories, "All categories");

  return (
    <ExpensesPageContent
      groupId={groupId}
      currentUserId={currentUserId}
      dashboard={{ summary, summaryLoading }}
      catalog={{ categories: categories ?? [], members }}
      selectOptions={{ memberOpts, catOpts }}
      filters={filters}
      page={{
        loading,
        ready: expensesList !== undefined,
        expenses,
        totalCount,
        pageTotal,
      }}
      dialog={{
        state: expenseDialog,
        onOpen: openExpenseDialog,
        onClose: closeExpenseDialog,
        onRequestDelete: requestDeleteExpense,
        deleting,
        deleteError,
        onConfirmDelete: (id) => void handleDeleteExpense(id),
      }}
      deleteAll={{
        open: deleteAllOpen,
        onOpenChange: (open) => {
          setDeleteAllOpen(open);
          if (!open) {
            setDeleteAllConfirmText("");
            deleteAllExpenses.reset();
          }
        },
        onOpen: () => {
          setDeleteAllOpen(true);
          deleteAllExpenses.reset();
        },
        confirmText: deleteAllConfirmText,
        onConfirmTextChange: setDeleteAllConfirmText,
        onCancel: () => {
          setDeleteAllOpen(false);
          setDeleteAllConfirmText("");
          deleteAllExpenses.reset();
        },
        onConfirmDelete: () => void handleDeleteAllExpenses(),
      }}
    />
  );
}

/** The full page markup: header/toolbar, add/edit/delete dialog, filters,
 * the mobile/mobile+desktop row trees, pagination, and the delete-all
 * dialog. Receives every value/handler as props from `ExpensesClient` so
 * this function owns only rendering, not state. */
function ExpensesPageContent({
  groupId,
  currentUserId,
  dashboard,
  catalog,
  selectOptions,
  filters,
  page,
  dialog,
  deleteAll,
}: {
  groupId: string;
  currentUserId: string;
  dashboard: { summary: DashboardSummary | undefined; summaryLoading: boolean };
  catalog: { categories: CategoryWithBalances[]; members: MemberWithColor[] };
  selectOptions: { memberOpts: SelectOption[]; catOpts: SelectOption[] };
  filters: ExpensesFilters;
  page: {
    loading: boolean;
    ready: boolean;
    expenses: Expense[];
    totalCount: number;
    pageTotal: number;
  };
  dialog: {
    state: ExpenseDialogState;
    onOpen: (expense: Expense | null) => void;
    onClose: () => void;
    onRequestDelete: (expense: Expense) => void;
    deleting: boolean;
    deleteError: string | null;
    onConfirmDelete: (id: string) => void;
  };
  deleteAll: {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    onOpen: () => void;
    confirmText: string;
    onConfirmTextChange: (value: string) => void;
    onCancel: () => void;
    onConfirmDelete: () => void;
  };
}) {
  const { summary, summaryLoading } = dashboard;

  if (!summaryLoading && !summary) {
    return (
      <div className="p-8 text-center text-slate-500">
        No dashboard data available. Please select a group.
      </div>
    );
  }

  return (
    <div className="p-4 md:p-8 max-w-7xl mx-auto space-y-8">
      <ExpensesToolbar
        groupId={groupId}
        hasSummary={!!summary}
        showFilters={filters.showFilters}
        activeFilterCount={filters.activeFilterCount}
        disableDeleteAll={
          !canDeleteAllExpenses(!!summary, page.expenses.length)
        }
        onToggleFilters={() => {
          filters.setShowFilters((s) => !s);
        }}
        onDeleteAllOpen={deleteAll.onOpen}
        onAddExpense={() => {
          dialog.onOpen(null);
        }}
      />

      <ExpenseDialogContent
        dialogState={dialog.state}
        groupId={groupId}
        catalog={{
          categories: catalog.categories,
          members: summary?.members ?? [],
        }}
        currentUserId={currentUserId}
        deleteStatus={{
          deleting: dialog.deleting,
          deleteError: dialog.deleteError,
        }}
        onClose={dialog.onClose}
        onRequestDelete={dialog.onRequestDelete}
        onConfirmDelete={dialog.onConfirmDelete}
      />

      <Card>
        {filters.showFilters && (
          <ExpensesFilterPanel
            memberId={filters.memberId}
            categoryFilterId={filters.categoryFilterId}
            from={filters.from}
            to={filters.to}
            memberOpts={selectOptions.memberOpts}
            catOpts={selectOptions.catOpts}
            activeFilterCount={filters.activeFilterCount}
            onMemberChange={filters.setMemberId}
            onCategoryChange={filters.setCategoryFilterId}
            onFromChange={filters.setFrom}
            onToChange={filters.setTo}
            onClearFilters={filters.clearFilters}
          />
        )}

        <div
          className={`flex items-center justify-between text-sm pb-2 mb-2 ${filters.showFilters ? "pt-2" : "pt-0"}`}
        >
          <span className="text-slate-500">
            Showing{" "}
            <strong className="font-semibold text-slate-900 dark:text-white">
              {page.expenses.length.toString()}
            </strong>{" "}
            of {page.totalCount.toString()} expenses
          </span>
          <span className="text-slate-500">
            Total{" "}
            <strong className="font-semibold text-slate-900 dark:text-white font-mono tabular-nums">
              {formatCurrency(page.pageTotal)}
            </strong>
          </span>
        </div>

        {page.expenses.length > 0 && (
          <p className="md:hidden flex items-center gap-1.5 text-xs text-slate-500 dark:text-slate-400 mb-3">
            <Info size={13} /> Tap any expense to edit it.
          </p>
        )}

        <div className="md:hidden -mx-6 border-t border-slate-100 dark:border-slate-800">
          <ExpensesRowsMobile
            loading={page.loading}
            ready={page.ready}
            expenses={page.expenses}
            members={catalog.members}
            activeFilterCount={filters.activeFilterCount}
            clearFilters={filters.clearFilters}
            hasSummary={!!summary}
            onSelect={dialog.onOpen}
            onAdd={() => {
              dialog.onOpen(null);
            }}
          />
        </div>

        <div className="hidden md:block rounded-2xl border border-slate-100 dark:border-slate-800 overflow-hidden">
          <div className="hidden md:grid grid-cols-[2.2fr_1.4fr_1.4fr_1fr_64px] gap-4 items-center px-5 py-3 bg-slate-50 dark:bg-slate-800/50 border-b border-slate-100 dark:border-slate-800">
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

          <ExpensesRowsDesktop
            loading={page.loading}
            ready={page.ready}
            expenses={page.expenses}
            members={catalog.members}
            activeFilterCount={filters.activeFilterCount}
            clearFilters={filters.clearFilters}
            hasSummary={!!summary}
            onEdit={dialog.onOpen}
            onDelete={dialog.onRequestDelete}
            onAdd={() => {
              dialog.onOpen(null);
            }}
          />
        </div>

        <Pagination
          offset={filters.offset}
          pageSize={PAGE_SIZE}
          totalCount={page.totalCount}
          onOffsetChange={filters.setOffset}
        />
      </Card>

      <DeleteAllExpensesDialog
        open={deleteAll.open}
        onOpenChange={deleteAll.onOpenChange}
        confirmText={deleteAll.confirmText}
        onConfirmTextChange={deleteAll.onConfirmTextChange}
        deleting={dialog.deleting}
        deleteError={dialog.deleteError}
        onCancel={deleteAll.onCancel}
        onConfirmDelete={deleteAll.onConfirmDelete}
      />
    </div>
  );
}

/** Header/toolbar block: title, subtitle, and the reload/filters/delete-all/add
 * actions, plus the mobile add-expense FAB (both trigger the same add flow). */
function ExpensesToolbar({
  groupId,
  hasSummary,
  showFilters,
  activeFilterCount,
  disableDeleteAll,
  onToggleFilters,
  onDeleteAllOpen,
  onAddExpense,
}: {
  groupId: string;
  hasSummary: boolean;
  showFilters: boolean;
  activeFilterCount: number;
  disableDeleteAll: boolean;
  onToggleFilters: () => void;
  onDeleteAllOpen: () => void;
  onAddExpense: () => void;
}) {
  return (
    <>
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
          <ReloadButton queryKey={queryKeys.group(groupId)} />
          <Button variant="outline" onClick={onToggleFilters}>
            <SlidersHorizontal size={16} className="mr-1.5" />
            {showFilters ? "Hide Filters" : "Filters"}
            {activeFilterCount > 0 ? ` (${activeFilterCount.toString()})` : ""}
          </Button>
          <Button
            variant="outline"
            disabled={disableDeleteAll}
            onClick={onDeleteAllOpen}
          >
            <Trash2 size={16} className="mr-1.5" />
            Delete All
          </Button>
          <Button
            variant="cta"
            className="hidden md:inline-flex"
            disabled={!hasSummary}
            onClick={onAddExpense}
          >
            <Plus size={16} className="mr-1" />
            Add Expense
          </Button>
        </div>
      </header>

      <div className="md:hidden">
        <AddExpenseFab disabled={!hasSummary} onClick={onAddExpense} />
      </div>
    </>
  );
}

/** The filters grid (member/category/date-range + clear), shown inside the
 * list `Card` when `showFilters` is toggled on. */
function ExpensesFilterPanel({
  memberId,
  categoryFilterId,
  from,
  to,
  memberOpts,
  catOpts,
  activeFilterCount,
  onMemberChange,
  onCategoryChange,
  onFromChange,
  onToChange,
  onClearFilters,
}: {
  memberId: string;
  categoryFilterId: string;
  from: string;
  to: string;
  memberOpts: SelectOption[];
  catOpts: SelectOption[];
  activeFilterCount: number;
  onMemberChange: (value: string) => void;
  onCategoryChange: (value: string) => void;
  onFromChange: (value: string) => void;
  onToChange: (value: string) => void;
  onClearFilters: () => void;
}) {
  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-3">
      <div>
        <span className="block text-xs font-medium text-slate-500 mb-1.5">
          Member
        </span>
        <Select
          value={memberId}
          onValueChange={onMemberChange}
          options={memberOpts}
        />
      </div>
      <div>
        <span className="block text-xs font-medium text-slate-500 mb-1.5">
          Category
        </span>
        <Select
          value={categoryFilterId}
          onValueChange={onCategoryChange}
          options={catOpts}
        />
      </div>
      <div>
        <span className="block text-xs font-medium text-slate-500 mb-1.5">
          From
        </span>
        <DatePicker
          value={from}
          onChange={onFromChange}
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
          onChange={onToChange}
          granularity="day"
          placeholder="Any date"
        />
      </div>
      {activeFilterCount > 0 && (
        <div className="col-span-2 md:col-span-4 flex justify-end">
          <Button variant="ghost" size="sm" onClick={onClearFilters}>
            <X size={13} className="mr-1" /> Clear filters
          </Button>
        </div>
      )}
    </div>
  );
}

/** Mobile row list: skeleton while loading, empty state, or the mapped rows —
 * the loading/empty/populated branch that used to live inline in `ExpensesClient`. */
function ExpensesRowsMobile({
  loading,
  ready,
  expenses,
  members,
  activeFilterCount,
  clearFilters,
  hasSummary,
  onSelect,
  onAdd,
}: {
  loading: boolean;
  ready: boolean;
  expenses: Expense[];
  members: MemberWithColor[];
  activeFilterCount: number;
  clearFilters: () => void;
  hasSummary: boolean;
  onSelect: (expense: Expense) => void;
  onAdd: () => void;
}) {
  if (loading || !ready) return <ExpensesRowsSkeletonMobile />;

  if (expenses.length === 0) {
    return (
      <EmptyExpenses
        activeFilterCount={activeFilterCount}
        clearFilters={clearFilters}
        hasSummary={hasSummary}
        onAdd={onAdd}
      />
    );
  }

  return (
    <>
      {expenses.map((expense) => {
        const member = members.find((m) => m.id === expense.payerId);

        return (
          <ExpenseRowMobile
            key={expense.id}
            expense={expense}
            member={member}
            onSelect={() => {
              onSelect(expense);
            }}
          />
        );
      })}
    </>
  );
}

/** Desktop row list: same loading/empty/populated branch as
 * `ExpensesRowsMobile`, rendering the grid row variant with its `RowMenu`. */
function ExpensesRowsDesktop({
  loading,
  ready,
  expenses,
  members,
  activeFilterCount,
  clearFilters,
  hasSummary,
  onEdit,
  onDelete,
  onAdd,
}: {
  loading: boolean;
  ready: boolean;
  expenses: Expense[];
  members: MemberWithColor[];
  activeFilterCount: number;
  clearFilters: () => void;
  hasSummary: boolean;
  onEdit: (expense: Expense) => void;
  onDelete: (expense: Expense) => void;
  onAdd: () => void;
}) {
  if (loading || !ready) return <ExpensesRowsSkeletonDesktop />;

  if (expenses.length === 0) {
    return (
      <EmptyExpenses
        activeFilterCount={activeFilterCount}
        clearFilters={clearFilters}
        hasSummary={hasSummary}
        onAdd={onAdd}
      />
    );
  }

  return (
    <>
      {expenses.map((expense) => {
        const member = members.find((m) => m.id === expense.payerId);

        return (
          <ExpenseRowDesktop
            key={expense.id}
            expense={expense}
            member={member}
            onEdit={() => {
              onEdit(expense);
            }}
            onDelete={() => {
              onDelete(expense);
            }}
          />
        );
      })}
    </>
  );
}

/** Mobile expense row: the whole row is a click/Enter target that opens the
 * edit dialog (no per-row menu on mobile, matching the original inline markup). */
function ExpenseRowMobile({
  expense,
  member,
  onSelect,
}: {
  expense: Expense;
  member: ExpenseMember;
  onSelect: () => void;
}) {
  const dateLabel = formatExpenseDate(expense.date);

  return (
    <div
      onClick={onSelect}
      onKeyDown={(e) => {
        if (e.key === "Enter") {
          onSelect();
        }
      }}
      tabIndex={0}
      role="button"
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
            <CategoryIconTile icon={expense.categoryIcon} size="2xs" />
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

/** Desktop expense row: grid layout with a trailing `RowMenu` for edit/delete. */
function ExpenseRowDesktop({
  expense,
  member,
  onEdit,
  onDelete,
}: {
  expense: Expense;
  member: ExpenseMember;
  onEdit: () => void;
  onDelete: () => void;
}) {
  const dateLabel = formatExpenseDate(expense.date);

  return (
    <div className="grid grid-cols-[2.2fr_1.4fr_1.4fr_1fr_64px] items-center px-5 py-3 gap-4 select-none outline-none border-b border-slate-100 dark:border-slate-800 last:border-b-0 hover:bg-slate-50 dark:hover:bg-slate-800/40 transition-colors">
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
            <CategoryIconTile icon={expense.categoryIcon} size="2xs" />
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
        <span className="truncate">{expense.payerName.split(" ")[0]}</span>
      </div>

      <div className="text-sm font-semibold font-mono tabular-nums text-slate-900 dark:text-white text-right">
        {formatCurrency(expense.amount)}
      </div>

      <div className="flex justify-end">
        <RowMenu onEdit={onEdit} onDelete={onDelete} />
      </div>
    </div>
  );
}

/** The expense being edited, or `null` for "add"/"delete" modes — pulled out
 * of `ExpenseDialogContent` since the title/description helpers below also
 * need it. */
function getEditingExpense(dialogState: ExpenseDialogState): Expense | null {
  return dialogState.mode === "form" ? dialogState.expense : null;
}

/** The dialog title for each of the 3 `ExpenseDialogState` modes. */
function expenseDialogTitle(
  dialogState: ExpenseDialogState,
  editingExpense: Expense | null,
): string {
  if (dialogState.mode === "delete") return "Delete Expense";
  return editingExpense ? "Edit Expense" : "Add Expense";
}

/** The dialog description for each of the 3 `ExpenseDialogState` modes. */
function expenseDialogDescription(
  dialogState: ExpenseDialogState,
  editingExpense: Expense | null,
): string {
  if (dialogState.mode === "delete") {
    return `Delete "${dialogState.expense.description}" (${formatCurrency(dialogState.expense.amount)})? This action cannot be undone.`;
  }
  return editingExpense
    ? "Update the details of this spend."
    : "Record a spend and assign it to the member who paid.";
}

/** The add/edit/delete `ResponsiveDialog`, owning the 3-way title/description/
 * body branching on `ExpenseDialogState.mode` — the single biggest cyclomatic
 * contributor to the pre-extraction `ExpensesClient`. */
function ExpenseDialogContent({
  dialogState,
  groupId,
  catalog,
  currentUserId,
  deleteStatus,
  onClose,
  onRequestDelete,
  onConfirmDelete,
}: {
  dialogState: ExpenseDialogState;
  groupId: string;
  catalog: {
    categories: CategoryWithBalances[];
    members: DashboardSummary["members"];
  };
  currentUserId: string;
  deleteStatus: { deleting: boolean; deleteError: string | null };
  onClose: () => void;
  onRequestDelete: (expense: Expense) => void;
  onConfirmDelete: (id: string) => void;
}) {
  const { categories, members } = catalog;
  const { deleting, deleteError } = deleteStatus;
  const editingExpense = getEditingExpense(dialogState);

  return (
    <ResponsiveDialog
      open={dialogState.mode !== "closed"}
      onOpenChange={(open) => {
        if (!open) onClose();
      }}
      title={expenseDialogTitle(dialogState, editingExpense)}
      description={expenseDialogDescription(dialogState, editingExpense)}
    >
      {dialogState.mode === "delete" ? (
        <>
          {deleteError && (
            <div className="text-xs font-medium text-brand-expense bg-brand-expense/5 dark:bg-brand-expense/10 dark:text-red-400 p-2.5 rounded-lg border border-brand-expense/20 dark:border-red-900/30">
              {deleteError}
            </div>
          )}
          <DialogFooter destructive>
            <Button variant="outline" disabled={deleting} onClick={onClose}>
              Cancel
            </Button>
            <Button
              variant="expense"
              disabled={deleting}
              onClick={() => {
                onConfirmDelete(dialogState.expense.id);
              }}
            >
              {deleting ? "Deleting…" : "Delete Expense"}
            </Button>
          </DialogFooter>
        </>
      ) : (
        <ExpenseForm
          key={editingExpense?.id ?? "new"}
          groupId={groupId}
          categories={categories}
          members={members}
          defaultPayerId={members.find((m) => m.userId === currentUserId)?.id}
          expense={editingExpense ?? undefined}
          onSuccess={onClose}
          onCancel={onClose}
          // Unconditional (unlike `main`'s `isMobile && editingExpense`
          // gate) — ADR-3 rules out a JS mobile/desktop split here, and
          // `RowMenu`'s delete plus this form's delete affordance both
          // being available on desktop is harmless, not a regression.
          onDelete={
            editingExpense
              ? () => {
                  onRequestDelete(editingExpense);
                }
              : undefined
          }
        />
      )}
    </ResponsiveDialog>
  );
}

/** The delete-all `ResponsiveDialog` body: typed-confirmation gate ("DELETE"). */
function DeleteAllExpensesDialog({
  open,
  onOpenChange,
  confirmText,
  onConfirmTextChange,
  deleting,
  deleteError,
  onCancel,
  onConfirmDelete,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  confirmText: string;
  onConfirmTextChange: (value: string) => void;
  deleting: boolean;
  deleteError: string | null;
  onCancel: () => void;
  onConfirmDelete: () => void;
}) {
  return (
    <ResponsiveDialog
      open={open}
      onOpenChange={onOpenChange}
      title="Delete All Expenses"
      description="This will permanently delete every expense in this group, regardless of any active filters. This action cannot be undone."
    >
      <div className="space-y-2">
        <label className="text-sm font-medium">
          Type <span className="font-mono font-semibold">DELETE</span> to
          confirm
        </label>
        <Input
          value={confirmText}
          onChange={(e) => {
            onConfirmTextChange(e.target.value);
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
        <Button variant="outline" disabled={deleting} onClick={onCancel}>
          Cancel
        </Button>
        <Button
          variant="expense"
          disabled={deleting || confirmText.trim() !== "DELETE"}
          onClick={onConfirmDelete}
        >
          {deleting ? "Deleting…" : "Delete All Expenses"}
        </Button>
      </DialogFooter>
    </ResponsiveDialog>
  );
}

/** Extracted so both the mobile and desktop trees (ADR-3) share the same empty-state markup. */
function EmptyExpenses({
  activeFilterCount,
  clearFilters,
  hasSummary,
  onAdd,
}: {
  activeFilterCount: number;
  clearFilters: () => void;
  hasSummary: boolean;
  onAdd: () => void;
}) {
  return (
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
            disabled={!hasSummary}
            onClick={onAdd}
          >
            <Plus size={16} className="mr-1" />
            Add your first expense
          </Button>
        </>
      )}
    </div>
  );
}
