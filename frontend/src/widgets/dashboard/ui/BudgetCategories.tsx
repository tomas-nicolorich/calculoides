import { useState } from "react";
import { Card } from "../../../shared/ui/Card";
import { Avatar } from "../../../shared/ui/Avatar";
import { ProgressMeter } from "../../../shared/ui/money";
import {
  formatCurrency,
  progressPercent,
  progressState,
} from "../../../shared/api/dashboardUtils";
import {
  CategoryWithBalances,
  CategoryBalance,
} from "../../../../../shared/src/types/redesign";
import { ChevronDown, Edit2, Trash2, Plus, ArrowRightLeft } from "lucide-react";
import { Dialog, DialogFooter } from "../../../shared/ui/Dialog";
import { apiClient } from "../../../shared/api/client";
import { Select, Input } from "../../../shared/ui";
import { cn } from "../../../shared/lib/utils";
import { Button } from "../../../shared/ui/Button";
import {
  CategoryIconTile,
  CATEGORY_ICON_KEYS,
} from "../../../shared/lib/categoryIcons";

export interface MemberRich {
  id: string;
  name: string;
  income: number;
  share: number;
  /** Stable 0-based position in the group; drives avatar colour. */
  index: number;
}

interface CategoryFormFieldsProps {
  name: string;
  setName: (v: string) => void;
  monthlyBudget: string;
  setMonthlyBudget: (v: string) => void;
  icon: string;
  setIcon: (v: string) => void;
  members: MemberRich[];
  selectedMemberIds: string[];
  toggleMember: (id: string) => void;
  formError: string | null;
  formLoading: boolean;
  submitLabel: string;
  onCancel?: () => void;
}

function CategoryFormFields({
  name,
  setName,
  monthlyBudget,
  setMonthlyBudget,
  icon,
  setIcon,
  members,
  selectedMemberIds,
  toggleMember,
  formError,
  formLoading,
  submitLabel,
  onCancel,
}: CategoryFormFieldsProps) {
  return (
    <>
      <div className="space-y-2">
        <label className="text-sm font-medium">Category Name</label>
        <Input
          placeholder="e.g. Rent, Groceries"
          value={name}
          onChange={(e) => {
            setName(e.target.value);
          }}
          required
        />
      </div>
      <div className="space-y-2">
        <label className="text-sm font-medium">Monthly Budget (€)</label>
        <Input
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
      <div className="space-y-2">
        <label className="text-sm font-medium">Icon</label>
        <div className="flex flex-wrap gap-2">
          {CATEGORY_ICON_KEYS.map((key) => {
            const selected = icon === key;
            return (
              <button
                key={key}
                type="button"
                onClick={() => {
                  setIcon(key);
                }}
                aria-pressed={selected}
                aria-label={`Icon: ${key}`}
                title={key}
                className={cn(
                  "rounded-xl p-0.5 transition-all",
                  selected
                    ? "ring-2 ring-brand-category ring-offset-1 ring-offset-card"
                    : "opacity-70 hover:opacity-100",
                )}
              >
                <CategoryIconTile icon={key} size="md" />
              </button>
            );
          })}
        </div>
      </div>
      <div className="space-y-2">
        <label className="text-sm font-medium">
          Assign to Members (Optional)
        </label>
        <div className="flex flex-wrap gap-2">
          {members.map((member) => {
            // Any member can be assigned to a category, including those with no
            // income. Zero-income members are excluded from the *allocation*
            // (greyed in the category breakdown), but remain freely selectable.
            return (
              <button
                key={member.id}
                type="button"
                onClick={() => {
                  toggleMember(member.id);
                }}
                className={`px-3 py-1 rounded-full text-sm transition-colors ${
                  selectedMemberIds.includes(member.id)
                    ? "bg-brand-balance text-white"
                    : "bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300"
                }`}
              >
                {member.name}
              </button>
            );
          })}
        </div>
        <p className="text-xs text-slate-500">
          If none selected, category applies to everyone. Members with no income
          are not included.
        </p>
      </div>
      {formError && <p className="text-sm text-red-500">{formError}</p>}
      <div className="flex gap-3 pt-2">
        {onCancel && (
          <Button
            type="button"
            variant="outline"
            className="flex-1"
            onClick={onCancel}
            disabled={formLoading}
          >
            Cancel
          </Button>
        )}
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

interface MemberRowProps {
  balance: CategoryBalance;
  member: MemberRich | undefined;
  /** Income share percent for this member (e.g. 32.5) */
  share: number;
  onTransfer: () => void;
}

// fallow-ignore-next-line complexity
function MemberRow({ balance, member, share, onTransfer }: MemberRowProps) {
  const isOver = balance.remainingQuota < 0;
  const displayName = member?.name ?? balance.memberId.slice(0, 4);

  // Zero-income members are excluded from the allocation (#130): keep them
  // visible but greyed/struck, with no quota/transfer, so they don't silently
  // vanish from the category breakdown.
  if (balance.excluded) {
    return (
      <div
        className="flex items-center justify-between gap-2 rounded-lg bg-slate-50 dark:bg-slate-800/40 px-3 py-2 opacity-60"
        title="No income — not included"
      >
        <div className="flex items-center gap-2 min-w-0">
          <Avatar
            name={member?.name ?? balance.memberId}
            colorIndex={member?.index ?? 0}
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

  const memberState = progressState(balance.spent, balance.quota);
  const spendLabelColour =
    memberState === "blocked"
      ? "text-brand-expense"
      : memberState === "behind"
        ? "text-brand-transfer"
        : "text-brand-income";
  return (
    <div className="rounded-lg bg-slate-50 dark:bg-slate-800/40 px-3 py-2 space-y-2">
      {/* Top row: avatar + name + Custom badge | transfer btn + share% + amount */}
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2 min-w-0">
          <Avatar
            name={member?.name ?? balance.memberId}
            colorIndex={member?.index ?? 0}
            size="xs"
          />
          <span className="text-sm font-medium text-slate-700 dark:text-slate-200 truncate">
            {displayName}
          </span>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <button
            onClick={onTransfer}
            className="p-1.5 text-brand-transfer bg-transparent hover:bg-slate-100 dark:hover:bg-slate-700 focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2 rounded transition-all"
            title="Initiate Transfer"
            aria-label={`Transfer from ${member?.name ?? "member"}`}
          >
            <ArrowRightLeft size={14} />
          </button>
          <span
            className="text-xs rounded-full px-2 py-0.5 font-mono bg-slate-700 dark:bg-slate-800"
            style={{
              color: `var(--color-member-${String((member?.index ?? 0) + 1)})`,
            }}
          >
            {share.toFixed(1)}%
          </span>
          <span className="text-sm font-medium font-mono tnum">
            {formatCurrency(balance.quota)}
          </span>
        </div>
      </div>
      {/* Second row: Spent: x | x left / x over */}
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
      {/* Progress bar */}
      <ProgressMeter
        value={balance.spent}
        max={balance.quota}
        state={memberState}
      />
    </div>
  );
}

interface BudgetCategoriesProps {
  categories: CategoryWithBalances[];
  isOwner: boolean;
  onDelete: (id: string) => void;
  groupId: string;
  members: MemberRich[];
  onRefresh: () => void;
}

export function BudgetCategories({
  categories,
  isOwner,
  onDelete,
  groupId,
  members,
  onRefresh,
}: BudgetCategoriesProps) {
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set());
  const [isAdding, setIsAdding] = useState(false);
  const [editingCategory, setEditingCategory] =
    useState<CategoryWithBalances | null>(null);
  const [categoryToDelete, setCategoryToDelete] = useState<{
    id: string;
    name: string;
  } | null>(null);

  const [name, setName] = useState("");
  const [monthlyBudget, setMonthlyBudget] = useState("");
  const [icon, setIcon] = useState("other");
  const [selectedMemberIds, setSelectedMemberIds] = useState<string[]>([]);
  const [formLoading, setFormLoading] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

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

  const handleAddSubmit = async (e: React.SyntheticEvent) => {
    e.preventDefault();
    setFormLoading(true);
    setFormError(null);
    try {
      await apiClient.fetch(
        `/transactions?action=category-create&groupId=${groupId}`,
        {
          method: "POST",
          body: JSON.stringify({
            name,
            monthlyBudget: Number(monthlyBudget),
            icon,
            memberIds:
              selectedMemberIds.length > 0 ? selectedMemberIds : undefined,
          }),
        },
      );
      setIsAdding(false);
      setName("");
      setMonthlyBudget("");
      setIcon("other");
      setSelectedMemberIds([]);
      onRefresh();
    } catch (err) {
      setFormError(
        err instanceof Error ? err.message : "Failed to create category",
      );
    } finally {
      setFormLoading(false);
    }
  };

  const handleEditSubmit = async (e: React.SyntheticEvent) => {
    e.preventDefault();
    if (!editingCategory) return;
    setFormLoading(true);
    setFormError(null);
    try {
      await apiClient.fetch(
        `/transactions?action=category-update&id=${editingCategory.id}`,
        {
          method: "POST",
          body: JSON.stringify({
            name,
            monthlyBudget: Number(monthlyBudget),
            icon,
            memberIds:
              selectedMemberIds.length > 0 ? selectedMemberIds : undefined,
          }),
        },
      );
      setEditingCategory(null);
      setName("");
      setMonthlyBudget("");
      setSelectedMemberIds([]);
      onRefresh();
    } catch (err) {
      setFormError(
        err instanceof Error ? err.message : "Failed to update category",
      );
    } finally {
      setFormLoading(false);
    }
  };

  const handleTransferSubmit = async (e: React.SyntheticEvent) => {
    e.preventDefault();
    if (!transferCategory) return;
    setFormLoading(true);
    setFormError(null);
    try {
      await apiClient.fetch("/transactions?action=transfer-create", {
        method: "POST",
        body: JSON.stringify({
          categoryId: transferCategory.id,
          fromMemberId: transferFromMemberId,
          toMemberId: transferToMemberId,
          amount: Number(transferAmount),
        }),
      });
      setTransferCategory(null);
      setTransferAmount("");
      onRefresh();
    } catch (err) {
      setFormError(
        err instanceof Error ? err.message : "Failed to transfer budget",
      );
    } finally {
      setFormLoading(false);
    }
  };

  const toggleMember = (id: string) => {
    setSelectedMemberIds((prev) =>
      prev.includes(id) ? prev.filter((m) => m !== id) : [...prev, id],
    );
  };

  /** Resolve the from-member for the transfer dialog. */
  const transferFromMember = members.find((m) => m.id === transferFromMemberId);
  const transferFromFirstName =
    transferFromMember?.name.split(" ")[0] ?? transferFromMemberId;

  return (
    <Card
      title="Budget Categories"
      className="-mx-4 sm:mx-0 rounded-none sm:rounded-2xl border-x-0 sm:border-x"
    >
      <div className="space-y-4">
        <div className="flex justify-between items-center">
          <div className="text-sm text-slate-400">
            Shared buckets · each member&apos;s share is set by income. Expand
            to view and transfer.
          </div>
          <Button
            variant="ghost"
            size="sm"
            leadingIcon={<Plus size={16} />}
            onClick={() => {
              setIsAdding(true);
            }}
          >
            New Category
          </Button>
        </div>

        <Dialog
          open={isAdding}
          onOpenChange={setIsAdding}
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
              members={members}
              selectedMemberIds={selectedMemberIds}
              toggleMember={toggleMember}
              formError={formError}
              formLoading={formLoading}
              submitLabel="Save Category"
              onCancel={() => {
                setIsAdding(false);
              }}
            />
          </form>
        </Dialog>

        <Dialog
          open={editingCategory !== null}
          onOpenChange={(open) => {
            if (!open) {
              setEditingCategory(null);
              setName("");
              setMonthlyBudget("");
              setSelectedMemberIds([]);
              setFormError(null);
            }
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
              members={members}
              selectedMemberIds={selectedMemberIds}
              toggleMember={toggleMember}
              formError={formError}
              formLoading={formLoading}
              submitLabel="Save Changes"
              onCancel={() => {
                setEditingCategory(null);
              }}
            />
          </form>
        </Dialog>

        {/* Transfer Budget dialog — From is locked to the row that was clicked */}
        <Dialog
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
            {/* Locked From line */}
            <div className="space-y-2">
              <label className="text-sm font-medium">From</label>
              <div className="flex items-center gap-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800 px-3 py-2 text-sm text-slate-700 dark:text-slate-200">
                {transferFromMember && (
                  <Avatar
                    name={transferFromMember.name}
                    colorIndex={transferFromMember.index}
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
                onValueChange={(val) => {
                  setTransferToMemberId(val);
                }}
                placeholder="Select recipient"
                options={members
                  .filter(
                    (m) =>
                      transferCategoryMemberIds.includes(m.id) &&
                      m.id !== transferFromMemberId,
                  )
                  .map((m) => ({
                    value: m.id,
                    label: m.name,
                  }))}
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
            {formError && <p className="text-sm text-red-500">{formError}</p>}
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
                disabled={formLoading || !transferToMemberId}
              >
                {formLoading ? "Processing..." : "Send Transfer"}
              </Button>
            </div>
          </form>
        </Dialog>

        {categories.length === 0 && (
          <p className="text-center py-8 text-slate-400 text-sm">
            No categories yet
          </p>
        )}

        <div className="flex flex-col gap-2 -mx-6 sm:mx-0">
          {categories.map((category) => {
            const isExpanded = expandedIds.has(category.id);
            const totalSpent = category.balances.reduce(
              (sum, b) => sum + b.spent,
              0,
            );
            const spentPct = progressPercent(
              totalSpent,
              category.monthlyBudget,
            );
            return (
              <div
                key={category.id}
                className="rounded-none sm:rounded-2xl border-x-0 sm:border-x border-y border-slate-100 dark:border-slate-800 overflow-hidden"
              >
                <button
                  type="button"
                  onClick={() => {
                    toggleExpanded(category.id);
                  }}
                  aria-expanded={isExpanded}
                  className="w-full flex items-center gap-3 p-4 text-left hover:bg-slate-50 dark:hover:bg-slate-900/40 transition-colors"
                >
                  <CategoryIconTile icon={category.icon} size="md" />
                  <div className="flex-1 min-w-0">
                    {/* Name row: name (left) + budget amount (right) */}
                    <div className="flex items-baseline justify-between gap-2">
                      <span className="font-medium text-slate-900 dark:text-white truncate">
                        {category.name}
                      </span>
                      <span className="text-xs text-slate-400 font-mono tnum shrink-0">
                        {formatCurrency(category.monthlyBudget)}
                      </span>
                    </div>
                    {/* Progress meter with "x% spent" label */}
                    <ProgressMeter
                      value={totalSpent}
                      max={category.monthlyBudget}
                      state={progressState(totalSpent, category.monthlyBudget)}
                      valueLabel={`${String(spentPct)}% spent`}
                      className="mt-2"
                    />
                  </div>
                  <ChevronDown
                    size={18}
                    className={cn(
                      "shrink-0 text-slate-400 transition-transform duration-200",
                      isExpanded && "rotate-180",
                    )}
                  />
                </button>

                {isExpanded && (
                  <div className="px-4 pb-4 space-y-3">
                    {/* Empty state (#130): no member with income → no allocation. */}
                    {(category.isEmpty ??
                      category.balances.every((b) => b.excluded)) && (
                      <div className="rounded-lg bg-slate-50 dark:bg-slate-800/40 px-4 py-6 text-center space-y-1">
                        <p className="text-sm font-medium text-slate-600 dark:text-slate-300">
                          No members with income in this category
                        </p>
                        <p className="text-xs text-slate-500">
                          Set a member&apos;s income to start splitting this
                          budget.
                        </p>
                      </div>
                    )}
                    <div className="space-y-2">
                      {category.balances.map((balance: CategoryBalance) => (
                        <MemberRow
                          key={balance.memberId}
                          balance={balance}
                          member={members.find(
                            (m) => m.id === balance.memberId,
                          )}
                          share={balance.percentage}
                          onTransfer={() => {
                            setTransferCategory({
                              id: category.id,
                              name: category.name,
                            });
                            setTransferCategoryMemberIds(
                              category.balances
                                .filter((b) => !b.excluded)
                                .map((b) => b.memberId),
                            );
                            setTransferFromMemberId(balance.memberId);
                            setTransferToMemberId("");
                            setTransferAmount("");
                            setFormError(null);
                          }}
                        />
                      ))}
                    </div>

                    <div className="flex gap-2 pt-1 border-t border-slate-100 dark:border-slate-800">
                      <button
                        onClick={() => {
                          setEditingCategory(category);
                          setName(category.name);
                          setMonthlyBudget(category.monthlyBudget.toString());
                          setIcon(category.icon ?? "other");
                          const assignedMemberIds = category.balances.map(
                            (b) => b.memberId,
                          );
                          setSelectedMemberIds(
                            assignedMemberIds.length < members.length
                              ? assignedMemberIds
                              : [],
                          );
                          setFormError(null);
                        }}
                        className="flex items-center gap-1.5 px-3 py-1.5 text-xs text-slate-500 hover:text-brand-balance hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors"
                        aria-label="Edit category"
                      >
                        <Edit2 size={14} />
                        Edit
                      </button>
                      {isOwner && (
                        <button
                          onClick={() => {
                            setCategoryToDelete({
                              id: category.id,
                              name: category.name,
                            });
                          }}
                          className="flex items-center gap-1.5 px-3 py-1.5 text-xs text-slate-500 hover:text-brand-expense hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors"
                          aria-label="Delete category"
                        >
                          <Trash2 size={14} />
                          Delete
                        </button>
                      )}
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>

        <Dialog
          open={categoryToDelete !== null}
          onOpenChange={(open) => {
            if (!open) setCategoryToDelete(null);
          }}
          title="Delete Category"
          description={`Are you sure you want to delete the category "${categoryToDelete?.name ?? ""}"? This action cannot be undone.`}
        >
          <DialogFooter>
            <button
              onClick={() => {
                setCategoryToDelete(null);
              }}
              className="px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={() => {
                if (categoryToDelete) {
                  onDelete(categoryToDelete.id);
                  setCategoryToDelete(null);
                }
              }}
              className="px-4 py-2 rounded-xl bg-brand-expense text-white hover:opacity-90 transition-opacity"
            >
              Delete Category
            </button>
          </DialogFooter>
        </Dialog>
      </div>
    </Card>
  );
}
