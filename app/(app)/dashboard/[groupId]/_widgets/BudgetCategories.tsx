"use client";

import { useState, type CSSProperties, type SyntheticEvent } from "react";
import { ArrowRightLeft, ChevronDown, Plus } from "lucide-react";
import {
  Avatar,
  Button,
  Card,
  CategoryIconTile,
  IconPicker,
  Input,
  ResponsiveDialog,
  RowMenu,
  Select,
  Skeleton,
} from "../../../../_ui";
import { ProgressMeter } from "../../../../_ui/money";
import { BudgetCategoriesSkeleton } from "../_skeletons";
import { formatCurrency } from "../../../../../lib/format-currency";
import { progressPercent, progressState } from "../../../../../lib/progress";
import { cn } from "../../../../../lib/cn";
import { useDashboardSummary } from "../../../../_data/summary";
import {
  useCategoriesList,
  useCreateCategory,
  useUpdateCategory,
  useDeleteCategory,
} from "../../../../_data/categories";
import {
  useCreateTransfer,
  useTransfersByCategory,
} from "../../../../_data/transfers";

interface CategoryBalance {
  memberId: string;
  quota: number;
  spent: number;
  percentage: number;
  remainingQuota: number;
  excluded?: boolean;
}

interface CategoryRow {
  id: string;
  name: string;
  monthlyBudget: number;
  icon?: string;
  balances: CategoryBalance[];
  isEmpty?: boolean;
}

interface RowMember {
  id: string;
  name: string;
  colorIndex: number;
}

/** Shared by the create/update dialogs (PR 15, ADR-9 slice 2 of 2). Scoped
 * down from `main`'s `CategoryFormFields` — no per-member assignment toggle
 * (no spec/task scenario requires it; every category defaults to "applies
 * to everyone", `memberIds: undefined`, same as omitting the toggle
 * entirely on `main`'s own create/edit payload for that case). */
function CategoryFormFields({
  name,
  setName,
  monthlyBudget,
  setMonthlyBudget,
  icon,
  setIcon,
  formError,
  formLoading,
  submitLabel,
  onCancel,
}: {
  name: string;
  setName: (v: string) => void;
  monthlyBudget: string;
  setMonthlyBudget: (v: string) => void;
  icon: string;
  setIcon: (v: string) => void;
  formError: string | null;
  formLoading: boolean;
  submitLabel: string;
  onCancel: () => void;
}) {
  return (
    <>
      <div className="space-y-2">
        <label htmlFor="category-name" className="text-sm font-medium">
          Category Name
        </label>
        <Input
          id="category-name"
          placeholder="e.g. Rent, Groceries"
          value={name}
          onChange={(e) => {
            setName(e.target.value);
          }}
          required
        />
      </div>
      <div className="space-y-2">
        <label htmlFor="category-budget" className="text-sm font-medium">
          Monthly Budget (€)
        </label>
        <Input
          id="category-budget"
          type="number"
          step="0.01"
          placeholder="0.00"
          value={monthlyBudget}
          onChange={(e) => {
            setMonthlyBudget(e.target.value);
          }}
          required
        />
      </div>
      <IconPicker icon={icon} onChange={setIcon} tone="category" />
      {formError && <p className="text-sm text-brand-expense">{formError}</p>}
      <div className="flex gap-3 pt-2">
        <Button
          type="button"
          variant="outline"
          className="flex-1"
          onClick={onCancel}
          disabled={formLoading}
        >
          Cancel
        </Button>
        <Button
          type="submit"
          variant="balance"
          className="flex-1"
          disabled={formLoading}
        >
          {formLoading ? "Saving..." : submitLabel}
        </Button>
      </div>
    </>
  );
}

/** Per-category drill-down (dashboard-view: "Category drill-down lists only
 * that category's transfers"). Only fetches while its row is expanded. */
function TransferHistory({
  groupId,
  categoryId,
  isExpanded,
}: {
  groupId: string;
  categoryId: string;
  isExpanded: boolean;
}) {
  const { data, isLoading } = useTransfersByCategory(
    groupId,
    categoryId,
    isExpanded,
  );

  if (!isExpanded) return null;

  return (
    <div className="space-y-1.5 pt-2 border-t border-slate-100 dark:border-slate-800">
      <p className="text-[11px] font-medium text-slate-400 uppercase tracking-widest">
        Transfer History
      </p>
      {isLoading && (
        <div className="space-y-1.5">
          <Skeleton className="h-3 w-full" />
          <Skeleton className="h-3 w-full" />
        </div>
      )}
      {!isLoading && (!data || data.length === 0) && (
        <p className="text-xs text-slate-400">No transfers yet</p>
      )}
      {data?.map((transfer) => (
        <div
          key={transfer.id}
          data-testid="category-transfer-row"
          className="flex items-center justify-between gap-2 text-xs text-slate-500"
        >
          <span>
            {transfer.fromMember?.member?.user?.name ?? "?"} →{" "}
            {transfer.toMember?.member?.user?.name ?? "?"}
          </span>
          <span className="font-mono tnum shrink-0">
            {formatCurrency(transfer.amount)}
          </span>
        </div>
      ))}
    </div>
  );
}

/** A single expanded per-member balance row. Ported from `main`'s
 * `frontend/src/widgets/dashboard/ui/BudgetCategories.tsx` `MemberRow`
 * markup, including the transfer-trigger icon that opens the shared
 * "Transfer Budget" dialog locked to this member as the From side. */
function MemberRow({
  balance,
  member,
  onTransfer,
}: {
  balance: CategoryBalance;
  member: RowMember | undefined;
  onTransfer: () => void;
}) {
  const displayName = member?.name ?? balance.memberId.slice(0, 4);

  // Zero-income members are excluded from the allocation (#130): keep them
  // visible but greyed/struck, with no quota, so they don't silently vanish
  // from the category breakdown.
  if (balance.excluded) {
    return (
      <div
        className="flex items-center justify-between gap-2 rounded-lg bg-slate-50 dark:bg-slate-800/40 px-3 py-2 opacity-60"
        title="No income — not included"
      >
        <div className="flex items-center gap-2 min-w-0">
          <Avatar
            name={displayName}
            colorIndex={member?.colorIndex ?? 0}
            size="xs"
          />
          <span className="text-sm font-medium text-slate-500 line-through truncate">
            {displayName}
          </span>
        </div>
        <span className="text-xs text-slate-400 shrink-0">
          No income — not included
        </span>
      </div>
    );
  }

  const isOver = balance.remainingQuota < 0;
  const state = progressState(balance.spent, balance.quota);
  const spendLabelColour =
    state === "blocked"
      ? "text-brand-expense"
      : state === "behind"
        ? "text-brand-transfer"
        : "text-brand-income";

  return (
    <div className="rounded-lg bg-slate-50 dark:bg-slate-800/40 px-3 py-2 space-y-2">
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2 min-w-0">
          <Avatar
            name={displayName}
            colorIndex={member?.colorIndex ?? 0}
            size="xs"
          />
          <span className="text-sm font-medium text-slate-700 dark:text-slate-200 truncate">
            {displayName}
          </span>
        </div>
        <div className="flex items-center gap-1 shrink-0">
          <button
            onClick={onTransfer}
            className="p-1.5 text-brand-transfer bg-transparent hover:bg-slate-100 dark:hover:bg-slate-700 focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2 rounded transition-all"
            title="Initiate Transfer"
            aria-label={`Transfer from ${displayName}`}
          >
            <ArrowRightLeft size={14} />
          </button>
          <span
            className="member-pill-text text-xs rounded-full px-2 py-0.5 font-mono tnum"
            style={
              {
                backgroundColor: `color-mix(in srgb, var(--color-member-${String((member?.colorIndex ?? 0) + 1)}) 14%, transparent)`,
                "--pill-color": `var(--color-member-${String((member?.colorIndex ?? 0) + 1)})`,
              } as CSSProperties
            }
          >
            {balance.percentage.toFixed(1)}%
          </span>
          <span className="text-sm font-medium font-mono tnum">
            {formatCurrency(balance.quota)}
          </span>
        </div>
      </div>
      <div className="flex items-center justify-between gap-2 text-xs text-slate-500">
        <span>
          Spent:{" "}
          <span className="font-mono tnum">
            {formatCurrency(balance.spent)}
          </span>
        </span>
        <span className={cn("font-mono tnum font-medium", spendLabelColour)}>
          {isOver
            ? `${formatCurrency(Math.abs(balance.remainingQuota))} over`
            : `${formatCurrency(balance.remainingQuota)} left`}
        </span>
      </div>
      <ProgressMeter value={balance.spent} max={balance.quota} state={state} />
    </div>
  );
}

/** A single accordion row: header (name, budget, header `ProgressMeter`,
 * `RowMenu` edit/delete) plus expand/collapse per-member balances and the
 * per-category transfer-history drill-down. Each member row's transfer icon
 * opens the widget-level "Transfer Budget" dialog via `onTransfer`, locked
 * to that member as the From side. */
function CategoryRowItem({
  groupId,
  category,
  isExpanded,
  isOwner,
  onToggle,
  onEdit,
  onDelete,
  onTransfer,
  members,
}: {
  groupId: string;
  category: CategoryRow;
  isExpanded: boolean;
  isOwner: boolean;
  onToggle: () => void;
  onEdit: () => void;
  onDelete: () => void;
  onTransfer: (category: CategoryRow, balance: CategoryBalance) => void;
  members: RowMember[];
}) {
  const totalSpent = category.balances.reduce((sum, b) => sum + b.spent, 0);
  const spentPct = progressPercent(totalSpent, category.monthlyBudget);
  const allExcluded = category.balances.every((b) => b.excluded);

  return (
    <div className="rounded-2xl border border-slate-100 dark:border-slate-800 overflow-hidden">
      <div className="w-full flex items-center gap-3 p-4">
        <button
          type="button"
          onClick={onToggle}
          aria-expanded={isExpanded}
          className="flex-1 min-w-0 flex items-center gap-3 text-left"
        >
          <CategoryIconTile icon={category.icon} size="md" />
          <div className="flex-1 min-w-0">
            <div className="flex items-baseline justify-between gap-2">
              <span className="font-medium text-slate-900 dark:text-white truncate">
                {category.name}
              </span>
              <span className="text-xs text-slate-400 font-mono tnum shrink-0">
                {formatCurrency(category.monthlyBudget)}
              </span>
            </div>
            <ProgressMeter
              value={totalSpent}
              max={category.monthlyBudget}
              tone="category"
              state={progressState(totalSpent, category.monthlyBudget)}
              valueLabel={`${String(spentPct)}% spent`}
              className="mt-2"
            />
          </div>
          <ChevronDown
            size={18}
            aria-hidden
            className={cn(
              "shrink-0 text-slate-400 transition-transform duration-200",
              isExpanded && "rotate-180",
            )}
          />
        </button>
        <RowMenu onEdit={onEdit} onDelete={isOwner ? onDelete : undefined} />
      </div>

      {isExpanded && (
        <div className="px-4 pb-4 space-y-3">
          {/* Empty-allocation state (#130): no member with income -> no
           * allocation was computed for this category. */}
          {(category.isEmpty ?? allExcluded) && (
            <div className="rounded-lg bg-slate-50 dark:bg-slate-800/40 px-4 py-6 text-center space-y-1">
              <p className="text-sm font-medium text-slate-600 dark:text-slate-300">
                No members with income in this category
              </p>
              <p className="text-xs text-slate-500">
                Set a member&apos;s income to start splitting this budget.
              </p>
            </div>
          )}
          <div className="space-y-2">
            {category.balances.map((balance) => (
              <MemberRow
                key={balance.memberId}
                balance={balance}
                member={members.find((m) => m.id === balance.memberId)}
                onTransfer={() => {
                  onTransfer(category, balance);
                }}
              />
            ))}
          </div>
          <TransferHistory
            groupId={groupId}
            categoryId={category.id}
            isExpanded={isExpanded}
          />
        </div>
      )}
    </div>
  );
}

/**
 * Accordion (ADR-9, both slices): category rows with a header `ProgressMeter`
 * and `RowMenu`, expand/collapse per-member balance breakdown and
 * per-category transfer history, plus a widget-level "Transfer Budget"
 * dialog shared across every category — opened from a member row's
 * transfer-trigger icon, locked to that member as the From side (ported
 * from `main`'s `frontend/src/widgets/dashboard/ui/BudgetCategories.tsx`).
 * Data seam: self-subscribes to the hydrated `queryKeys.categories` cache
 * (same seam `BudgetTransfers` uses for `queryKeys.summary`) instead of
 * receiving `categories` as a prop, so it owns its own loading/error state
 * independent of the other five widgets (spec: "Loading state precedes
 * hydration"). Member names/avatar colours are resolved from
 * `queryKeys.summary`'s `members` array (array position = `colorIndex`,
 * same convention `IncomeOverview`/`BudgetTransfers` use); a balance whose
 * member has not hydrated yet falls back to `memberId.slice(0, 4)`, mirroring
 * `main`'s widget.
 *
 * PR 15 adds create/update/delete-with-confirmation dialogs (all three
 * `lib/actions/category.ts` mutations invalidate `queryKeys.group(groupId)`
 * on success, same contract `BudgetTransfers` established), the per-category
 * transfer-history drill-down, and the shared "Transfer Budget" dialog —
 * every mutation-shaped affordance ADR-9 deferred out of PR 14.
 */
export function BudgetCategories({
  groupId,
  currentUserId,
}: {
  groupId: string;
  currentUserId: string;
}) {
  const { data: categories, isLoading, isError } = useCategoriesList(groupId);
  const { data: summary } = useDashboardSummary(groupId);
  const isOwner = summary?.ownerId === currentUserId;
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set());

  const [isAdding, setIsAdding] = useState(false);
  const [editingCategory, setEditingCategory] = useState<CategoryRow | null>(
    null,
  );
  const [categoryToDelete, setCategoryToDelete] = useState<{
    id: string;
    name: string;
  } | null>(null);

  const [name, setName] = useState("");
  const [monthlyBudget, setMonthlyBudget] = useState("");
  const [icon, setIcon] = useState("other");

  const [transferCategory, setTransferCategory] = useState<{
    id: string;
    name: string;
  } | null>(null);
  const [transferCategoryMemberIds, setTransferCategoryMemberIds] = useState<
    string[]
  >([]);
  const [transferFromMemberId, setTransferFromMemberId] = useState("");
  const [transferToMemberId, setTransferToMemberId] = useState("");
  const [transferAmount, setTransferAmount] = useState("");

  const createCategory = useCreateCategory(groupId);
  const updateCategory = useUpdateCategory(groupId);
  const deleteCategoryMutation = useDeleteCategory(groupId);
  const transferBudget = useCreateTransfer(groupId);

  const formLoading = createCategory.isPending || updateCategory.isPending;
  const formError =
    (createCategory.error instanceof Error
      ? createCategory.error.message
      : null) ??
    (updateCategory.error instanceof Error
      ? updateCategory.error.message
      : null);

  const resetForm = () => {
    setName("");
    setMonthlyBudget("");
    setIcon("other");
  };

  const openAdd = () => {
    createCategory.reset();
    resetForm();
    setIsAdding(true);
  };

  const openEdit = (category: CategoryRow) => {
    updateCategory.reset();
    setName(category.name);
    setMonthlyBudget(String(category.monthlyBudget));
    setIcon(category.icon ?? "other");
    setEditingCategory(category);
  };

  const handleAddSubmit = async (e: SyntheticEvent) => {
    e.preventDefault();
    const result = await createCategory.mutateAsync({
      groupId,
      name,
      monthlyBudget: Number(monthlyBudget),
      icon,
    });
    if (result.ok) {
      setIsAdding(false);
      resetForm();
    }
  };

  const handleEditSubmit = async (e: SyntheticEvent) => {
    e.preventDefault();
    if (!editingCategory) return;
    const result = await updateCategory.mutateAsync({
      categoryId: editingCategory.id,
      name,
      monthlyBudget: Number(monthlyBudget),
      icon,
    });
    if (result.ok) {
      setEditingCategory(null);
      resetForm();
    }
  };

  const confirmDelete = async () => {
    if (!categoryToDelete) return;
    await deleteCategoryMutation.mutateAsync({
      categoryId: categoryToDelete.id,
    });
    setCategoryToDelete(null);
  };

  const openTransfer = (category: CategoryRow, balance: CategoryBalance) => {
    setTransferCategory({ id: category.id, name: category.name });
    setTransferCategoryMemberIds(
      category.balances.filter((b) => !b.excluded).map((b) => b.memberId),
    );
    setTransferFromMemberId(balance.memberId);
    setTransferToMemberId("");
    setTransferAmount("");
    transferBudget.reset();
  };

  const handleTransferSubmit = async (e: SyntheticEvent) => {
    e.preventDefault();
    if (!transferCategory) return;
    await transferBudget.mutateAsync({
      categoryId: transferCategory.id,
      fromMemberId: transferFromMemberId,
      toMemberId: transferToMemberId,
      amount: Number(transferAmount),
    });
    setTransferCategory(null);
    setTransferAmount("");
  };

  if (isLoading) {
    return (
      <div data-testid="budget-categories-loading">
        <BudgetCategoriesSkeleton />
      </div>
    );
  }

  if (isError || !categories) {
    return (
      <Card title="Budget Categories">
        <p className="text-sm text-brand-expense">
          Failed to load budget categories.
        </p>
      </Card>
    );
  }

  const members: RowMember[] = (summary?.members ?? []).map((m, index) => ({
    id: m.id,
    name: m.name,
    colorIndex: index,
  }));

  const transferFromMember = members.find(
    (m) => m.id === transferFromMemberId,
  );
  const transferFromFirstName =
    transferFromMember?.name.split(" ")[0] ?? transferFromMemberId;

  const toggleExpanded = (id: string) => {
    setExpandedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  return (
    <Card title="Budget Categories">
      <div className="space-y-4">
        <div className="flex justify-between items-center">
          <div className="text-sm text-slate-400">
            Shared buckets · each member&apos;s share is set by income. Expand
            to view and transfer.
          </div>
          <Button variant="ghost" size="sm" onClick={openAdd}>
            <Plus size={16} className="mr-1" />
            New Category
          </Button>
        </div>

        <ResponsiveDialog
          open={isAdding}
          onOpenChange={(open) => {
            if (!open) setIsAdding(false);
          }}
          title="Add Category"
          description="Create a new budget category for your group."
          hideCloseButton
        >
          <form onSubmit={(e) => void handleAddSubmit(e)} className="space-y-4">
            <CategoryFormFields
              name={name}
              setName={setName}
              monthlyBudget={monthlyBudget}
              setMonthlyBudget={setMonthlyBudget}
              icon={icon}
              setIcon={setIcon}
              formError={formError}
              formLoading={formLoading}
              submitLabel="Save Category"
              onCancel={() => {
                setIsAdding(false);
              }}
            />
          </form>
        </ResponsiveDialog>

        <ResponsiveDialog
          open={editingCategory !== null}
          onOpenChange={(open) => {
            if (!open) setEditingCategory(null);
          }}
          title="Edit Category"
          description="Update details for this budget category."
          hideCloseButton
        >
          <form
            onSubmit={(e) => void handleEditSubmit(e)}
            className="space-y-4"
          >
            <CategoryFormFields
              name={name}
              setName={setName}
              monthlyBudget={monthlyBudget}
              setMonthlyBudget={setMonthlyBudget}
              icon={icon}
              setIcon={setIcon}
              formError={formError}
              formLoading={formLoading}
              submitLabel="Save Changes"
              onCancel={() => {
                setEditingCategory(null);
              }}
            />
          </form>
        </ResponsiveDialog>

        <ResponsiveDialog
          open={categoryToDelete !== null}
          onOpenChange={(open) => {
            if (!open) setCategoryToDelete(null);
          }}
          title="Delete Category"
          description={`Are you sure you want to delete "${categoryToDelete?.name ?? ""}"? This action cannot be undone.`}
        >
          <div className="flex gap-3 pt-2">
            <Button
              type="button"
              variant="outline"
              className="flex-1"
              onClick={() => {
                setCategoryToDelete(null);
              }}
            >
              Cancel
            </Button>
            <Button
              type="button"
              variant="expense"
              className="flex-1"
              disabled={deleteCategoryMutation.isPending}
              onClick={() => void confirmDelete()}
            >
              {deleteCategoryMutation.isPending
                ? "Deleting..."
                : "Delete Category"}
            </Button>
          </div>
        </ResponsiveDialog>

        {categories.length === 0 ? (
          <p className="text-center py-8 text-slate-400 text-sm">
            No categories yet
          </p>
        ) : (
          <div className="flex flex-col gap-2">
            {categories.map((category) => (
              <CategoryRowItem
                key={category.id}
                groupId={groupId}
                category={category}
                isExpanded={expandedIds.has(category.id)}
                isOwner={isOwner}
                onToggle={() => {
                  toggleExpanded(category.id);
                }}
                onEdit={() => {
                  openEdit(category);
                }}
                onDelete={() => {
                  setCategoryToDelete({ id: category.id, name: category.name });
                }}
                onTransfer={openTransfer}
                members={members}
              />
            ))}
          </div>
        )}

        <ResponsiveDialog
          open={transferCategory !== null}
          onOpenChange={(open) => {
            if (!open) setTransferCategory(null);
          }}
          hideCloseButton
          title="Transfer Budget"
          description={
            transferCategory
              ? `Move budget from ${transferFromFirstName}'s share of ${transferCategory.name} to another member.`
              : ""
          }
        >
          <form
            onSubmit={(e) => void handleTransferSubmit(e)}
            className="space-y-4"
          >
            <div className="space-y-2">
              <label className="text-sm font-medium">From</label>
              <div className="flex items-center gap-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800 px-3 py-2 text-sm text-slate-700 dark:text-slate-200">
                {transferFromMember && (
                  <Avatar
                    name={transferFromMember.name}
                    colorIndex={transferFromMember.colorIndex}
                    size="sm"
                  />
                )}
                <span>
                  From {transferFromFirstName}
                  {transferCategory ? ` · ${transferCategory.name}` : ""}
                </span>
              </div>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">To Member</label>
              <Select
                value={transferToMemberId}
                onValueChange={setTransferToMemberId}
                placeholder="Select recipient"
                options={members
                  .filter(
                    (m) =>
                      transferCategoryMemberIds.includes(m.id) &&
                      m.id !== transferFromMemberId,
                  )
                  .map((m) => ({ value: m.id, label: m.name }))}
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Amount (€)</label>
              <Input
                type="number"
                step="0.01"
                placeholder="0.00"
                value={transferAmount}
                onChange={(e) => {
                  setTransferAmount(e.target.value);
                }}
                required
              />
            </div>
            <div className="flex gap-3 pt-2">
              <Button
                type="button"
                variant="outline"
                className="flex-1"
                onClick={() => {
                  setTransferCategory(null);
                }}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                variant="transfer"
                className="flex-1"
                disabled={transferBudget.isPending || !transferToMemberId}
              >
                {transferBudget.isPending ? "Processing..." : "Send Transfer"}
              </Button>
            </div>
          </form>
        </ResponsiveDialog>
      </div>
    </Card>
  );
}
