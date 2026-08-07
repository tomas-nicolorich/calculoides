"use client";

import { useState, type SyntheticEvent } from "react";
import {
  useSavingsGoalsList,
  useCreateGoal,
  useDeleteGoal,
  useContributionUpsert,
  useContributionDelete,
  type SavingsGoal,
  type SavingsContributionBreakdown,
} from "./queries";

/** One goal's contribution-override row, extracted to keep {@link SavingsGoalItem} shallow. */
function ContributionRow({
  entry,
  draftValue,
  onDraftChange,
  onSave,
  onReset,
}: {
  entry: SavingsContributionBreakdown;
  draftValue: string;
  onDraftChange: (value: string) => void;
  onSave: () => void;
  onReset: () => void;
}) {
  return (
    <li className="flex items-center justify-between gap-3 text-sm">
      <span className="text-slate-600 dark:text-slate-300">
        {entry.user?.name ?? entry.memberId}: ${entry.actualAmount}
        {entry.isOverridden ? " (override)" : ""}
      </span>
      <div className="flex items-center gap-2">
        <input
          value={draftValue}
          onChange={(event) => {
            onDraftChange(event.target.value);
          }}
          placeholder="Override"
          type="number"
          className="h-8 w-24 rounded-md border border-slate-300 dark:border-slate-700 px-2"
        />
        <button
          type="button"
          onClick={onSave}
          className="text-xs text-brand-balance"
        >
          Save
        </button>
        {entry.isOverridden && (
          <button
            type="button"
            onClick={onReset}
            className="text-xs text-red-600"
          >
            Reset
          </button>
        )}
      </div>
    </li>
  );
}

/** One savings goal card, extracted to keep {@link SavingsGoalsListView} shallow. */
function SavingsGoalItem({
  goal,
  contributionDrafts,
  onDraftChange,
  onDeleteGoal,
  onSaveContribution,
  onResetContribution,
}: {
  goal: SavingsGoal;
  contributionDrafts: Record<string, string>;
  onDraftChange: (draftKey: string, value: string) => void;
  onDeleteGoal: () => void;
  onSaveContribution: (memberId: string) => void;
  onResetContribution: (memberId: string) => void;
}) {
  return (
    <li className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-card p-4 space-y-3">
      <div className="flex items-center justify-between gap-4">
        <div>
          <p className="font-medium text-slate-900 dark:text-white">
            {goal.name}
          </p>
          <p className="text-sm text-slate-500">
            {goal.currentAmount} / {goal.targetAmount}
          </p>
        </div>
        <button
          type="button"
          onClick={onDeleteGoal}
          className="text-sm text-red-600"
        >
          Delete
        </button>
      </div>

      {goal.breakdown.length > 0 && (
        <ul className="flex flex-col gap-2">
          {goal.breakdown.map((entry) => {
            const draftKey = `${goal.id}:${entry.memberId}`;
            return (
              <ContributionRow
                key={entry.memberId}
                entry={entry}
                draftValue={contributionDrafts[draftKey] ?? ""}
                onDraftChange={(value) => {
                  onDraftChange(draftKey, value);
                }}
                onSave={() => {
                  onSaveContribution(entry.memberId);
                }}
                onReset={() => {
                  onResetContribution(entry.memberId);
                }}
              />
            );
          })}
        </ul>
      )}
    </li>
  );
}

/** Extracted from {@link SavingsClient} to keep its own cognitive complexity low. */
function SavingsGoalsListView({
  goals,
  isLoading,
  contributionDrafts,
  onDraftChange,
  onDeleteGoal,
  onSaveContribution,
  onResetContribution,
}: {
  goals: SavingsGoal[];
  isLoading: boolean;
  contributionDrafts: Record<string, string>;
  onDraftChange: (draftKey: string, value: string) => void;
  onDeleteGoal: (goalId: string) => void;
  onSaveContribution: (goalId: string, memberId: string) => void;
  onResetContribution: (goalId: string, memberId: string) => void;
}) {
  if (isLoading) return <p data-testid="savings-loading">Loading…</p>;
  if (goals.length === 0) {
    return (
      <p className="text-slate-500">No savings goals yet for this group.</p>
    );
  }

  return (
    <ul className="flex flex-col gap-4" data-testid="savings-list">
      {goals.map((goal) => (
        <SavingsGoalItem
          key={goal.id}
          goal={goal}
          contributionDrafts={contributionDrafts}
          onDraftChange={onDraftChange}
          onDeleteGoal={() => {
            onDeleteGoal(goal.id);
          }}
          onSaveContribution={(memberId) => {
            onSaveContribution(goal.id, memberId);
          }}
          onResetContribution={(memberId) => {
            onResetContribution(goal.id, memberId);
          }}
        />
      ))}
    </ul>
  );
}

/**
 * Lean Next-app port of `frontend/src/pages/savings/ui/SavingsPage.tsx`
 * (6b.4) — plain Tailwind, create/delete goal and upsert/delete contribution
 * overrides wired through `lib/actions/savings.ts` Server Actions with
 * group-scoped cache invalidation, same "lean, not a full port" precedent as
 * `ExpensesClient`/`TransfersClient` (4b.6, 5.8). Full
 * dialog/skeleton/allocation-editor UI is out of this phase's scope.
 */
export function SavingsClient({ groupId }: { groupId: string }) {
  const { data: goals, isLoading } = useSavingsGoalsList(groupId);
  const createGoal = useCreateGoal(groupId);
  const removeGoal = useDeleteGoal(groupId);
  const upsertContribution = useContributionUpsert(groupId);
  const removeContribution = useContributionDelete(groupId);

  const [name, setName] = useState("");
  const [targetAmount, setTargetAmount] = useState("");
  const [targetDate, setTargetDate] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [contributionDrafts, setContributionDrafts] = useState<
    Record<string, string>
  >({});

  const handleCreate = async (event: SyntheticEvent) => {
    event.preventDefault();
    setError(null);

    const result = await createGoal.mutateAsync({
      groupId,
      name,
      targetAmount: Number(targetAmount),
      targetDate,
    });

    if (!result.ok) {
      setError(result.error);
      return;
    }

    setName("");
    setTargetAmount("");
    setTargetDate("");
  };

  const handleContributionSave = async (goalId: string, memberId: string) => {
    const draftKey = `${goalId}:${memberId}`;
    const amount = Number(contributionDrafts[draftKey]);
    if (Number.isNaN(amount)) return;

    const result = await upsertContribution.mutateAsync({
      goalId,
      memberId,
      amount,
    });

    if (result.ok) {
      setContributionDrafts((prev) =>
        Object.fromEntries(
          Object.entries(prev).filter(([key]) => key !== draftKey),
        ),
      );
    }
  };

  const goalsList = goals ?? [];

  return (
    <div className="p-4 md:p-8 max-w-4xl mx-auto space-y-8">
      <header className="flex flex-wrap items-start justify-between gap-4">
        <h1 className="text-3xl font-semibold tracking-tight text-slate-900 dark:text-white">
          Savings Goals
        </h1>
      </header>

      <form
        onSubmit={(event) => {
          void handleCreate(event);
        }}
        className="flex flex-wrap items-end gap-3"
      >
        <input
          value={name}
          onChange={(event) => {
            setName(event.target.value);
          }}
          placeholder="Goal name"
          className="h-10 flex-1 min-w-40 rounded-md border border-slate-300 dark:border-slate-700 px-3"
        />
        <input
          value={targetAmount}
          onChange={(event) => {
            setTargetAmount(event.target.value);
          }}
          placeholder="Target amount"
          type="number"
          className="h-10 w-36 rounded-md border border-slate-300 dark:border-slate-700 px-3"
        />
        <input
          value={targetDate}
          onChange={(event) => {
            setTargetDate(event.target.value);
          }}
          placeholder="YYYY-MM-DD"
          className="h-10 rounded-md border border-slate-300 dark:border-slate-700 px-3"
        />
        <button
          type="submit"
          disabled={createGoal.isPending}
          className="h-10 px-4 rounded-md bg-brand-balance text-white font-medium disabled:opacity-60"
        >
          {createGoal.isPending ? "Adding..." : "Add Goal"}
        </button>
        {error && <p className="text-sm text-red-600 w-full">{error}</p>}
      </form>

      <SavingsGoalsListView
        goals={goalsList}
        isLoading={isLoading}
        contributionDrafts={contributionDrafts}
        onDraftChange={(draftKey, value) => {
          setContributionDrafts((prev) => ({ ...prev, [draftKey]: value }));
        }}
        onDeleteGoal={(goalId) => {
          void removeGoal.mutateAsync({ goalId });
        }}
        onSaveContribution={(goalId, memberId) => {
          void handleContributionSave(goalId, memberId);
        }}
        onResetContribution={(goalId, memberId) => {
          void removeContribution.mutateAsync({ goalId, memberId });
        }}
      />
    </div>
  );
}
