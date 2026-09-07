"use client";

import { useState } from "react";
import { Plus } from "lucide-react";
import { useSavingsGoalsList, toFriendlySavingsError } from "../../../_data/savings";
import { Alert, Button, ReloadButton, ResponsiveDialog } from "../../../_ui";
import { queryKeys } from "../../../../lib/query-keys";
import { SavingsGoalList } from "./_components/SavingsGoalList";
import { SavingsGoalForm } from "./_components/SavingsGoalForm";
import { SavingsSkeleton } from "./_skeletons";

/**
 * Full port of prod's `frontend/src/pages/savings/ui/SavingsPage.tsx` —
 * replaces the earlier lean stub (plain inputs/buttons, no dialogs, no
 * skeleton, manual override text-buttons). Adapted to this repo's data
 * seam: `groupId` comes as a prop (no react-router `useParams`), and the
 * list/mutation hooks are the hoisted `app/_data/savings.ts` ones.
 */
export function SavingsClient({ groupId }: { groupId: string }) {
  const [createOpen, setCreateOpen] = useState(false);
  const { data: goals, isLoading, error, refetch } =
    useSavingsGoalsList(groupId);

  if (isLoading) {
    return <SavingsSkeleton />;
  }

  return (
    <div className="p-4 max-w-6xl mx-auto space-y-8 transition-opacity duration-300 starting:opacity-0">
      <header className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-slate-900 dark:text-white">
            Savings Goals
          </h1>
          <p className="text-slate-500 dark:text-slate-400 font-medium">
            Plan and track your group savings goals
          </p>
        </div>
        <div className="flex items-center gap-2">
          <ReloadButton queryKey={queryKeys.group(groupId)} />
          <Button
            variant="cta"
            onClick={() => {
              setCreateOpen(true);
            }}
          >
            <Plus size={16} className="mr-1" />
            Add Savings Goal
          </Button>
        </div>
      </header>

      {error && (
        <Alert
          action={{
            label: "Retry",
            onClick: () => {
              void refetch();
            },
          }}
        >
          {error instanceof Error
            ? toFriendlySavingsError(error.message)
            : "Something went wrong. Please try again."}
        </Alert>
      )}

      <SavingsGoalList groupId={groupId} goals={goals ?? []} />

      <ResponsiveDialog
        open={createOpen}
        onOpenChange={setCreateOpen}
        title="New Savings Goal"
        description="We'll split the monthly contribution by each member's income share."
      >
        <SavingsGoalForm
          groupId={groupId}
          onSuccess={() => {
            setCreateOpen(false);
          }}
          onCancel={() => {
            setCreateOpen(false);
          }}
        />
      </ResponsiveDialog>
    </div>
  );
}
