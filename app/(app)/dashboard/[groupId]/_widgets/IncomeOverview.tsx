"use client";

import { useState } from "react";
import { Edit2 } from "lucide-react";
import { Avatar, Button, IconButton, Input, Alert, Card } from "../../../../_ui";
import { StatFigure, MemberBar } from "../../../../_ui/money";
import { formatCurrency } from "../../../../../lib/format-currency";
import { useDashboardSummary } from "../../../../_data/summary";
import { useUpdateIncome } from "../../../../_data/members";

const NO_SPINNER_CLASS =
  "[appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none";

/**
 * Ported from `main`'s `frontend/src/widgets/dashboard/ui/IncomeOverview.tsx`
 * markup (edit-mode per-member rows + read-mode `MemberBar` legend). Data
 * seam: self-subscribes to the hydrated `queryKeys.summary` cache instead of
 * receiving `totalIncome`/`members` as props — same seam
 * `RemainingBalance`/`RecentExpenses` use (spec: "One Server Prefetch Feeds
 * the Summary-Dependent Widgets").
 *
 * Save-action styling deviates from `main` per `ui-design-system`: "An
 * income-related action uses the income variant" — Confirm below uses
 * `variant="income"`, not `main`'s generic `balance` variant.
 */
export function IncomeOverview({ groupId }: { groupId: string }) {
  const { data: summary, isLoading, isError } = useDashboardSummary(groupId);
  const updateIncomeMutation = useUpdateIncome(groupId);

  const [isEditing, setIsEditing] = useState(false);
  const [rawInputs, setRawInputs] = useState<Record<string, string>>({});
  const [saveError, setSaveError] = useState<string | null>(null);

  if (isLoading) {
    return (
      <Card title="Income Overview" data-testid="income-overview-loading">
        <p className="text-sm text-slate-400">Loading…</p>
      </Card>
    );
  }

  if (isError || !summary) {
    return (
      <Card title="Income Overview">
        <p className="text-sm text-brand-expense">
          Failed to load income overview.
        </p>
      </Card>
    );
  }

  const members = summary.members;

  const isMemberInputInvalid = (memberId: string) => {
    const raw = rawInputs[memberId] ?? "";
    const parsed = parseFloat(raw);
    return raw.trim() === "" || isNaN(parsed) || parsed < 0;
  };
  const invalidMembers = members.filter((m) => isMemberInputInvalid(m.id));
  const hasInvalidInput = invalidMembers.length > 0;
  const validationError = hasInvalidInput
    ? `Enter a valid non-negative income for ${invalidMembers.map((m) => m.name).join(", ")}.`
    : null;

  const handleEdit = () => {
    setRawInputs(
      Object.fromEntries(members.map((m) => [m.id, String(m.income)])),
    );
    setSaveError(null);
    setIsEditing(true);
  };

  const handleClose = () => {
    setRawInputs({});
    setSaveError(null);
    setIsEditing(false);
  };

  // dashboard-view general invalidation contract: only members whose income
  // actually changed are submitted; each `updateIncome` call's own
  // `onSuccess` (`useUpdateIncome`) invalidates `queryKeys.group(groupId)`.
  const handleConfirm = async () => {
    if (hasInvalidInput) return;
    const edited = members.filter(
      (m) => parseFloat(rawInputs[m.id] ?? "") !== m.income,
    );
    setSaveError(null);
    try {
      await Promise.all(
        edited.map((m) =>
          updateIncomeMutation.mutateAsync({
            memberId: m.id,
            income: parseFloat(rawInputs[m.id]),
          }),
        ),
      );
      setRawInputs({});
      setIsEditing(false);
    } catch {
      setSaveError("Failed to save income changes.");
    }
  };

  if (isEditing) {
    return (
      <Card title="Income Overview">
        <div className="space-y-6">
          <p className="text-xs text-slate-500 dark:text-slate-400 max-w-[60ch]">
            Updating income re-splits every quota, category, and savings goal
            by the new percentages.
          </p>

          <div className="flex flex-col gap-3">
            {members.map((m, i) => {
              const invalid = isMemberInputInvalid(m.id);
              return (
                <div
                  key={m.id}
                  className="flex items-center justify-between gap-2 text-sm"
                >
                  <span className="flex items-center gap-2 font-medium text-slate-600 dark:text-slate-300 min-w-0">
                    <Avatar name={m.name} colorIndex={i} size="xs" />
                    <span className="truncate">{m.name}</span>
                  </span>
                  <Input
                    type="number"
                    step="0.01"
                    prefix="€"
                    aria-label={`Income for ${m.name}`}
                    aria-invalid={invalid}
                    className={`h-8 w-28 font-mono tabular-nums text-xs ${NO_SPINNER_CLASS}`}
                    disabled={updateIncomeMutation.isPending}
                    value={rawInputs[m.id] ?? ""}
                    onChange={(e) => {
                      setRawInputs((prev) => ({
                        ...prev,
                        [m.id]: e.target.value,
                      }));
                    }}
                  />
                </div>
              );
            })}
          </div>

          {(validationError ?? saveError) && (
            <Alert>{validationError ?? saveError}</Alert>
          )}

          <div className="flex gap-3">
            <Button
              type="button"
              variant="outline"
              className="flex-1"
              onClick={handleClose}
              disabled={updateIncomeMutation.isPending}
            >
              Close
            </Button>
            <Button
              type="button"
              variant="income"
              className="flex-1"
              onClick={() => {
                void handleConfirm();
              }}
              disabled={hasInvalidInput || updateIncomeMutation.isPending}
            >
              {updateIncomeMutation.isPending ? "Saving…" : "Confirm"}
            </Button>
          </div>
        </div>
      </Card>
    );
  }

  const barMembers = members.map((m, i) => ({
    id: m.id,
    name: m.name,
    share: m.share,
    colorIndex: i,
    amount: formatCurrency(m.income),
  }));

  return (
    <Card title="Income Overview">
      <div className="space-y-6">
        <div className="flex justify-end">
          <IconButton aria-label="Edit incomes" size="sm" onClick={handleEdit}>
            <Edit2 size={14} />
          </IconButton>
        </div>
        <StatFigure
          label="Total Group Income"
          value={formatCurrency(summary.totalIncome)}
          tone="primary"
        />
        <MemberBar members={barMembers} legend emptyMessage="No members yet" />
      </div>
    </Card>
  );
}
