import { useState } from "react";
import { Card } from "../../../shared/ui/Card";
import { Avatar } from "../../../shared/ui/Avatar";
import { ProgressMeter } from "../../../shared/ui/money";
import {
  formatCurrency,
  categoryMemberShare,
} from "../../../shared/api/dashboardUtils";
import {
  CategoryWithBalances,
  CategoryBalance,
} from "../../../../../shared/src/types/redesign";
import { ChevronDown, Edit2, Trash2, Plus, ArrowRightLeft } from "lucide-react";
import { ResponsiveDialog } from "../../../shared/ui/ResponsiveDialog";
import { Dialog, DialogFooter } from "../../../shared/ui/Dialog";
import { apiClient } from "../../../shared/api/client";
import { Select, Input } from "../../../shared/ui";
import { cn } from "../../../shared/lib/utils";

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
        <label className="text-sm font-medium">Icon (Emoji)</label>
        <Input
          placeholder="💰"
          value={icon}
          onChange={(e) => {
            setIcon(e.target.value);
          }}
        />
      </div>
      <div className="space-y-2">
        <label className="text-sm font-medium">
          Assign to Members (Optional)
        </label>
        <div className="flex flex-wrap gap-2">
          {members.map((member) => (
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
          ))}
        </div>
        <p className="text-xs text-slate-500">
          If none selected, category applies to everyone.
        </p>
      </div>
      {formError && <p className="text-sm text-red-500">{formError}</p>}
      <button
        type="submit"
        disabled={formLoading}
        className="w-full p-3 mt-4 bg-brand-balance text-white rounded-xl font-medium disabled:opacity-50"
      >
        {formLoading ? "Saving..." : submitLabel}
      </button>
    </>
  );
}

interface MemberRowProps {
  balance: CategoryBalance;
  member: MemberRich | undefined;
  share: number;
  onTransfer: () => void;
}

// fallow-ignore-next-line complexity
function MemberRow({ balance, member, share, onTransfer }: MemberRowProps) {
  const isOver = balance.remainingQuota < 0;
  return (
    <div className="rounded-xl bg-slate-50 dark:bg-slate-900/50 p-3 space-y-2">
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2 min-w-0">
          <Avatar
            name={member?.name ?? balance.memberId}
            colorIndex={member?.index ?? 0}
            size="sm"
          />
          <span className="text-sm font-medium text-slate-700 dark:text-slate-200 truncate">
            {member?.name ?? balance.memberId.slice(0, 4)}
          </span>
          <span className="text-xs text-slate-400 shrink-0">
            {share.toFixed(1)}%
          </span>
        </div>
        <div className="flex items-center gap-3 shrink-0">
          <div className="text-right">
            <div
              className={cn(
                "text-sm font-medium font-mono tnum",
                isOver
                  ? "text-brand-expense"
                  : "text-slate-900 dark:text-white",
              )}
            >
              {formatCurrency(Math.abs(balance.remainingQuota))}{" "}
              <span className="text-xs font-normal font-sans">
                {isOver ? "over" : "left"}
              </span>
            </div>
            <div className="text-[10px] text-slate-500">
              Budget:{" "}
              <span className="font-mono tnum">
                {formatCurrency(balance.quota)}
              </span>{" "}
              | Spent:{" "}
              <span className="font-mono tnum">
                {formatCurrency(balance.spent)}
              </span>
            </div>
          </div>
          <button
            onClick={onTransfer}
            className="p-1.5 text-brand-transfer bg-transparent hover:bg-slate-100 dark:hover:bg-slate-700 focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2 rounded transition-all"
            title="Initiate Transfer"
            aria-label={`Transfer from ${member?.name ?? "member"}`}
          >
            <ArrowRightLeft size={14} />
          </button>
        </div>
      </div>
      <ProgressMeter
        value={balance.spent}
        max={balance.quota}
        tone={isOver ? "expense" : "category"}
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
  const [icon, setIcon] = useState("💰");
  const [selectedMemberIds, setSelectedMemberIds] = useState<string[]>([]);
  const [formLoading, setFormLoading] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  const [transferCategory, setTransferCategory] = useState<{
    id: string;
    name: string;
  } | null>(null);
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

  return (
    <Card title="Budget Categories">
      <div className="space-y-4">
        <div className="flex justify-between items-center">
          <div className="text-sm text-slate-500">
            Categories and per-member breakdown
          </div>
          <button
            onClick={() => {
              setIsAdding(true);
            }}
            className="flex items-center gap-2 px-4 py-2 bg-brand-income text-white rounded-xl hover:opacity-90 transition-opacity"
          >
            <Plus size={18} />
            <span>New Category</span>
          </button>
        </div>

        <ResponsiveDialog
          open={isAdding}
          onOpenChange={setIsAdding}
          title="Add Category"
          description="Create a new budget category for your group."
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
            />
          </form>
        </ResponsiveDialog>

        <ResponsiveDialog
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
            />
          </form>
        </ResponsiveDialog>

        <ResponsiveDialog
          open={transferCategory !== null}
          onOpenChange={(open) => {
            if (!open) setTransferCategory(null);
          }}
          title="Transfer Budget"
          description={`Transfer funds within ${transferCategory?.name ?? ""}`}
        >
          <form
            onSubmit={(e) => void handleTransferSubmit(e)}
            className="space-y-4"
          >
            <div className="space-y-2">
              <label className="text-sm font-medium">From</label>
              <Select
                value={transferFromMemberId}
                onValueChange={(val) => {
                  setTransferFromMemberId(val);
                }}
                disabled={!isOwner}
                options={members.map((m) => ({
                  value: m.id,
                  label: m.name,
                }))}
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">To</label>
              <Select
                value={transferToMemberId}
                onValueChange={(val) => {
                  setTransferToMemberId(val);
                }}
                placeholder="Select recipient"
                options={members.map((m) => ({
                  value: m.id,
                  label: m.name,
                  disabled: m.id === transferFromMemberId,
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
            <button
              type="submit"
              disabled={formLoading || !transferToMemberId}
              className="w-full p-3 mt-4 bg-brand-transfer text-white rounded-xl font-medium disabled:opacity-50"
            >
              {formLoading ? "Processing..." : "Transfer"}
            </button>
          </form>
        </ResponsiveDialog>

        {categories.length === 0 && (
          <p className="text-center py-8 text-slate-400 text-sm">
            No categories yet
          </p>
        )}

        <div className="flex flex-col gap-2">
          {categories.map((category) => {
            const isExpanded = expandedIds.has(category.id);
            const totalSpent = category.balances.reduce(
              (sum, b) => sum + b.spent,
              0,
            );
            const shareByMemberId = Object.fromEntries(
              categoryMemberShare(
                members,
                category.balances.map((b) => b.memberId),
              ).map((s) => [s.memberId, s.share]),
            );

            return (
              <div
                key={category.id}
                className="rounded-2xl border border-slate-100 dark:border-slate-800 border-l-2 border-l-brand-category overflow-hidden"
              >
                <button
                  type="button"
                  onClick={() => {
                    toggleExpanded(category.id);
                  }}
                  aria-expanded={isExpanded}
                  className="w-full flex items-center gap-3 p-4 text-left hover:bg-slate-50 dark:hover:bg-slate-900/40 transition-colors"
                >
                  <span className="text-2xl leading-none" aria-hidden>
                    {category.icon ?? "💰"}
                  </span>
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
                    <div className="space-y-2">
                      {category.balances.map((balance: CategoryBalance) => (
                        <MemberRow
                          key={balance.memberId}
                          balance={balance}
                          member={members.find(
                            (m) => m.id === balance.memberId,
                          )}
                          share={shareByMemberId[balance.memberId] ?? 0}
                          onTransfer={() => {
                            setTransferCategory({
                              id: category.id,
                              name: category.name,
                            });
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
                          setIcon(category.icon ?? "💰");
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
