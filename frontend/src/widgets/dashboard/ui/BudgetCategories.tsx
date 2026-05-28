import { useState } from "react";
import { Card } from "../../../shared/ui/Card";
import { formatCurrency } from "../../../shared/api/dashboardUtils";
import {
  CategoryWithBalances,
  CategoryBalance,
} from "../../../../../shared/src/types/redesign";
import { Edit2, Trash2, Plus, ArrowRightLeft } from "lucide-react";
import { ResponsiveDialog } from "../../../shared/ui/ResponsiveDialog";
import { Dialog, DialogFooter } from "../../../shared/ui/Dialog";
import { apiClient } from "../../../shared/api/client";

interface MemberBasic {
  id: string;
  name: string;
}

interface BudgetCategoriesProps {
  categories: CategoryWithBalances[];
  isOwner: boolean;
  onDelete: (id: string) => void;
  groupId: string;
  members: MemberBasic[];
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
  const [isAdding, setIsAdding] = useState(false);
  const [categoryToDelete, setCategoryToDelete] = useState<{
    id: string;
    name: string;
  } | null>(null);

  // Category Form State
  const [name, setName] = useState("");
  const [monthlyBudget, setMonthlyBudget] = useState("");
  const [icon, setIcon] = useState("💰");
  const [selectedMemberIds, setSelectedMemberIds] = useState<string[]>([]);
  const [formLoading, setFormLoading] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  // Transfer State
  const [transferCategory, setTransferCategory] = useState<{
    id: string;
    name: string;
  } | null>(null);
  const [transferFromMemberId, setTransferFromMemberId] = useState("");
  const [transferToMemberId, setTransferToMemberId] = useState("");
  const [transferAmount, setTransferAmount] = useState("");

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

  const getMemberName = (id: string) => {
    return members.find((m) => m.id === id)?.name ?? id.slice(0, 4);
  };

  return (
    <Card title="Budget Categories" className="md:col-span-2">
      <div className="space-y-6">
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
            <span>Add</span>
          </button>
        </div>

        {/* Add Category Dialog */}
        <ResponsiveDialog
          open={isAdding}
          onOpenChange={setIsAdding}
          title="Add Category"
          description="Create a new budget category for your group."
        >
          <form onSubmit={(e) => void handleAddSubmit(e)} className="space-y-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Category Name</label>
              <input
                className="w-full p-2 rounded-lg border border-slate-200 dark:border-slate-700 dark:bg-slate-800"
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
              <input
                type="number"
                step="0.01"
                className="w-full p-2 rounded-lg border border-slate-200 dark:border-slate-700 dark:bg-slate-800"
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
              <input
                className="w-full p-2 rounded-lg border border-slate-200 dark:border-slate-700 dark:bg-slate-800"
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
              {formLoading ? "Saving..." : "Save Category"}
            </button>
          </form>
        </ResponsiveDialog>

        {/* Transfer Dialog */}
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
              <select
                className="w-full p-2 rounded-lg border border-slate-200 dark:border-slate-700 dark:bg-slate-800"
                value={transferFromMemberId}
                onChange={(e) => {
                  setTransferFromMemberId(e.target.value);
                }}
                disabled={!isOwner}
                required
              >
                {members.map((m) => (
                  <option key={m.id} value={m.id}>
                    {m.name}
                  </option>
                ))}
              </select>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">To</label>
              <select
                className="w-full p-2 rounded-lg border border-slate-200 dark:border-slate-700 dark:bg-slate-800"
                value={transferToMemberId}
                onChange={(e) => {
                  setTransferToMemberId(e.target.value);
                }}
                required
              >
                <option value="" disabled>
                  Select recipient
                </option>
                {members.map((m) => (
                  <option
                    key={m.id}
                    value={m.id}
                    disabled={m.id === transferFromMemberId}
                  >
                    {m.name}
                  </option>
                ))}
              </select>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Amount (€)</label>
              <input
                type="number"
                step="0.01"
                className="w-full p-2 rounded-lg border border-slate-200 dark:border-slate-700 dark:bg-slate-800"
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

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {categories.map((category) => (
            <div
              key={category.id}
              className="p-4 rounded-2xl border border-slate-100 dark:border-slate-800 space-y-4"
            >
              <div className="flex justify-between items-start">
                <div>
                  <h4 className="font-bold text-slate-900 dark:text-white text-lg">
                    {category.icon} {category.name}
                  </h4>
                  <p className="text-sm text-slate-500">
                    Target: {formatCurrency(category.monthlyBudget)}
                  </p>
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => {
                      // Mocking Edit click for now, full edit will be implemented later
                      console.log("Edit category coming soon");
                    }}
                    className="p-2 text-slate-400 hover:text-brand-balance transition-colors"
                    aria-label="Edit"
                  >
                    <Edit2 size={18} />
                  </button>
                  {isOwner && (
                    <button
                      onClick={() => {
                        setCategoryToDelete({
                          id: category.id,
                          name: category.name,
                        });
                      }}
                      className="p-2 text-slate-400 hover:text-brand-expense transition-colors"
                      aria-label="Delete"
                    >
                      <Trash2 size={18} />
                    </button>
                  )}
                </div>
              </div>

              <div className="space-y-3">
                {category.balances.map((balance: CategoryBalance) => (
                  <div
                    key={balance.memberId}
                    className="flex justify-between items-center text-sm p-2 rounded-lg bg-slate-50 dark:bg-slate-800/50"
                  >
                    <div className="flex items-center gap-3">
                      <button
                        onClick={() => {
                          setTransferCategory({
                            id: category.id,
                            name: category.name,
                          });
                          setTransferFromMemberId(balance.memberId);
                          setTransferToMemberId("");
                          setTransferAmount("");
                          setFormError(null);
                        }}
                        className="p-1.5 text-brand-transfer bg-white dark:bg-slate-700 rounded-lg shadow-sm hover:shadow-md transition-all"
                        title="Initiate Transfer"
                      >
                        <ArrowRightLeft size={14} />
                      </button>
                      <span className="text-slate-600 dark:text-slate-300">
                        {getMemberName(balance.memberId)}
                      </span>
                    </div>
                    <div className="text-right">
                      <div className="font-medium text-slate-900 dark:text-white">
                        {formatCurrency(balance.remainingQuota)}{" "}
                        <span className="text-xs text-slate-400 font-normal">
                          left
                        </span>
                      </div>
                      <div className="text-[10px] text-slate-500">
                        Budget: {formatCurrency(balance.quota)} | Spent:{" "}
                        {formatCurrency(balance.spent)}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>

        {/* Delete Confirmation Dialog */}
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
