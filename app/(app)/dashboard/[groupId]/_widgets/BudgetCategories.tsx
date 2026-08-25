"use client";

import { useState, type SyntheticEvent } from "react";
import { ChevronDown, Plus } from "lucide-react";
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
} from "../../../../_ui";
import { ProgressMeter } from "../../../../_ui/money";
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

/** A labelled `Select`, mirrors `BudgetTransfers.tsx`'s `LabeledSelect`. */
function LabeledSelect({
  id,
  label,
  value,
  onValueChange,
  options,
}: {
  id: string;
  label: string;
  value: string;
  onValueChange: (value: string) => void;
  options: { value: string; label: string }[];
}) {
  const labelId = `${id}-label`;
  return (
    <div>
      <label htmlFor={id} id={labelId} className="text-xs text-slate-500">
        {label}
      </label>
      <Select
        id={id}
        labelId={labelId}
        value={value}
        onValueChange={onValueChange}
        options={options}
        placeholder="Select…"
      />
    </div>
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
      {isLoading && <p className="text-xs text-slate-400">Loading…</p>}
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

/** Category-scoped inline transfer form (ADR-9 file list: "inline
 * budget-transfer form → `lib/actions/transfer.create`, scoped to a single
 * category from within its expanded row"). Only members with a non-excluded
 * balance in this category are offered — mirrors `main`'s
 * `transferCategoryMemberIds` restriction. */
function CategoryTransferForm({
  groupId,
  category,
  members,
}: {
  groupId: string;
  category: CategoryRow;
  members: RowMember[];
}) {
  const [fromMemberId, setFromMemberId] = useState("");
  const [toMemberId, setToMemberId] = useState("");
  const [amount, setAmount] = useState("");
  const mutation = useCreateTransfer(groupId);

  const eligibleIds = new Set(
    category.balances.filter((b) => !b.excluded).map((b) => b.memberId),
  );
  const eligibleMembers = members.filter((m) => eligibleIds.has(m.id));
  const options = eligibleMembers.map((m) => ({ value: m.id, label: m.name }));

  const parsedAmount = parseFloat(amount);
  const isValid =
    fromMemberId !== "" &&
    toMemberId !== "" &&
    fromMemberId !== toMemberId &&
    !isNaN(parsedAmount) &&
    parsedAmount > 0;

  const handleSubmit = async () => {
    if (!isValid) return;
    await mutation.mutateAsync({
      categoryId: category.id,
      fromMemberId,
      toMemberId,
      amount: parsedAmount,
    });
    setFromMemberId("");
    setToMemberId("");
    setAmount("");
  };

  return (
    <form
      aria-label={`Transfer within ${category.name}`}
      onSubmit={(e) => {
        e.preventDefault();
        void handleSubmit();
      }}
      className="grid grid-cols-2 gap-2 pt-2 border-t border-slate-100 dark:border-slate-800"
    >
      <LabeledSelect
        id={`category-transfer-from-${category.id}`}
        label="From"
        value={fromMemberId}
        onValueChange={setFromMemberId}
        options={options}
      />
      <LabeledSelect
        id={`category-transfer-to-${category.id}`}
        label="To"
        value={toMemberId}
        onValueChange={setToMemberId}
        options={options}
      />
      <div className="col-span-2">
        <label
          htmlFor={`category-transfer-amount-${category.id}`}
          className="text-xs text-slate-500"
        >
          Amount
        </label>
        <Input
          id={`category-transfer-amount-${category.id}`}
          type="number"
          step="0.01"
          prefix="€"
          value={amount}
          onChange={(e) => {
            setAmount(e.target.value);
          }}
          placeholder="0.00"
        />
      </div>
      <Button
        type="submit"
        variant="transfer"
        size="sm"
        className="col-span-2"
        disabled={!isValid || mutation.isPending}
      >
        {mutation.isPending ? "Adding…" : "Add Transfer"}
      </Button>
    </form>
  );
}

/** A single expanded per-member balance row. Ported from `main`'s
 * `frontend/src/widgets/dashboard/ui/BudgetCategories.tsx` `MemberRow`
 * markup, minus the transfer affordance (ADR-9: mutation-shaped features
 * belong in PR 15). */
function MemberRow({
  balance,
  member,
}: {
  balance: CategoryBalance;
  member: RowMember | undefined;
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
        <span className="text-sm font-medium font-mono tnum shrink-0">
          {formatCurrency(balance.quota)}
        </span>
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
 * `RowMenu` edit/delete) plus expand/collapse per-member balances, the
 * per-category transfer-history drill-down, and the category-scoped inline
 * transfer form (ADR-9 slice 2 of 2 — PR 15 adds the mutation-shaped
 * affordances PR 14 intentionally left out). */
function CategoryRowItem({
  groupId,
  category,
  isExpanded,
  isOwner,
  onToggle,
  onEdit,
  onDelete,
  members,
}: {
  groupId: string;
  category: CategoryRow;
  isExpanded: boolean;
  isOwner: boolean;
  onToggle: () => void;
  onEdit: () => void;
  onDelete: () => void;
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
              />
            ))}
          </div>
          <TransferHistory
            groupId={groupId}
            categoryId={category.id}
            isExpanded={isExpanded}
          />
          <CategoryTransferForm
            groupId={groupId}
            category={category}
            members={members}
          />
        </div>
      )}
    </div>
  );
}

/**
 * Accordion (ADR-9, both slices): category rows with a header `ProgressMeter`
 * and `RowMenu`, expand/collapse per-member balance breakdown, per-category
 * transfer history, and a category-scoped inline transfer form. Data seam:
 * self-subscribes to the hydrated `queryKeys.categories` cache (same seam
 * `BudgetTransfers` uses for `queryKeys.summary`) instead of receiving
 * `categories` as a prop, so it owns its own loading/error state
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
 * transfer-history drill-down, and the category-scoped inline transfer form
 * — every mutation-shaped affordance ADR-9 deferred out of PR 14.
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

  const createCategory = useCreateCategory(groupId);
  const updateCategory = useUpdateCategory(groupId);
  const deleteCategoryMutation = useDeleteCategory(groupId);

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

  if (isLoading) {
    return (
      <Card title="Budget Categories" data-testid="budget-categories-loading">
        <p className="text-sm text-slate-400">Loading…</p>
      </Card>
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
                members={members}
              />
            ))}
          </div>
        )}
      </div>
    </Card>
  );
}
