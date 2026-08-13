"use client";

import { useState } from "react";
import { ChevronDown } from "lucide-react";
import { Avatar, Card } from "../../../../_ui";
import { ProgressMeter } from "../../../../_ui/money";
import { formatCurrency } from "../../../../../lib/format-currency";
import { progressPercent, progressState } from "../../../../../lib/progress";
import { cn } from "../../../../../lib/cn";
import { useDashboardSummary } from "../../../../_data/summary";
import { useCategoriesList } from "../../../../_data/categories";

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
  balances: CategoryBalance[];
  isEmpty?: boolean;
}

interface RowMember {
  id: string;
  name: string;
  colorIndex: number;
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

/** A single accordion row: header (name, budget, header `ProgressMeter`)
 * plus expand/collapse per-member balances. Read-only — ADR-9 keeps
 * create/edit/delete/transfer affordances out of this slice (PR 15). */
function CategoryRowItem({
  category,
  isExpanded,
  onToggle,
  members,
}: {
  category: CategoryRow;
  isExpanded: boolean;
  onToggle: () => void;
  members: RowMember[];
}) {
  const totalSpent = category.balances.reduce((sum, b) => sum + b.spent, 0);
  const spentPct = progressPercent(totalSpent, category.monthlyBudget);
  const allExcluded = category.balances.every((b) => b.excluded);

  return (
    <div className="rounded-2xl border border-slate-100 dark:border-slate-800 overflow-hidden">
      <button
        type="button"
        onClick={onToggle}
        aria-expanded={isExpanded}
        className="w-full flex items-center gap-3 p-4 text-left hover:bg-slate-50 dark:hover:bg-slate-900/40 transition-colors"
      >
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
        </div>
      )}
    </div>
  );
}

/**
 * Read-only accordion (ADR-9, slice 14 of 2): category rows with a header
 * `ProgressMeter`, expand/collapse per-member balance breakdown. Data seam:
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
 * Create/edit/delete category, the transfer affordance, and per-category
 * transfer-history drill-down are intentionally NOT in this slice — ADR-9
 * puts every mutation-shaped feature in PR 15, so this PR stays an
 * independently revertable, fully working read-only accordion.
 */
export function BudgetCategories({ groupId }: { groupId: string }) {
  const { data: categories, isLoading, isError } = useCategoriesList(groupId);
  const { data: summary } = useDashboardSummary(groupId);
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set());

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
        <div className="text-sm text-slate-400">
          Shared buckets · each member&apos;s share is set by income. Expand
          to view balances.
        </div>

        {categories.length === 0 ? (
          <p className="text-center py-8 text-slate-400 text-sm">
            No categories yet
          </p>
        ) : (
          <div className="flex flex-col gap-2">
            {categories.map((category) => (
              <CategoryRowItem
                key={category.id}
                category={category}
                isExpanded={expandedIds.has(category.id)}
                onToggle={() => {
                  toggleExpanded(category.id);
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
