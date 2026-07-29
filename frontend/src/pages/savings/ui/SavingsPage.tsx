import { useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useSetActiveGroup } from "../../../app/providers/ActiveGroupContext";
import { useSavingsGoals } from "../../../shared/api/savingsHooks";
import { SavingsGoalList } from "../../../features/savings/SavingsGoalList";
import { SavingsGoalForm } from "../../../features/savings/SavingsGoalForm";
import { ArrowLeft, Plus } from "lucide-react";
import { Alert, Button, Card, IconButton, Skeleton } from "../../../shared/ui";
import { ResponsiveDialog } from "../../../shared/ui/ResponsiveDialog";
import { toFriendlySavingsError } from "../../../entities/savings-goal/errorMessages";

function GoalCardSkeleton() {
  return (
    <Card>
      <div className="flex justify-between items-start pb-2">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <Skeleton className="h-9 w-9 rounded-lg" />
            <Skeleton className="h-5 w-32" />
          </div>
          <Skeleton className="h-4 w-28 mt-2.5" />
        </div>
        <Skeleton className="h-5 w-16 rounded-full" />
      </div>
      <Skeleton className="h-2 w-full rounded-full mt-3" />
      <div className="grid grid-cols-2 gap-4 mt-4 bg-slate-50 dark:bg-slate-900/50 p-3 rounded-lg border border-slate-100 dark:border-slate-800">
        <div className="space-y-1.5">
          <Skeleton className="h-3 w-20" />
          <Skeleton className="h-4 w-24" />
        </div>
        <div className="space-y-1.5 flex flex-col items-end">
          <Skeleton className="h-3 w-24" />
          <Skeleton className="h-4 w-20" />
        </div>
      </div>
      <div className="space-y-2 mt-4">
        {Array.from({ length: 2 }, (_, i) => (
          <div
            key={i}
            className="flex justify-between items-center py-2 px-3 rounded-md bg-slate-100 dark:bg-slate-800"
          >
            <div className="flex items-center gap-2">
              <Skeleton className="h-8 w-8 rounded-full" />
              <Skeleton className="h-3.5 w-20" />
            </div>
            <Skeleton className="h-4 w-14" />
          </div>
        ))}
      </div>
    </Card>
  );
}

export function SavingsPage() {
  const navigate = useNavigate();
  const { groupId } = useParams<{ groupId: string }>();
  useSetActiveGroup(groupId);
  const [createOpen, setCreateOpen] = useState(false);
  const {
    data: goals,
    isInitialLoading,
    error,
    refresh,
  } = useSavingsGoals(groupId ?? null);

  if (isInitialLoading) {
    return (
      <div className="p-4 max-w-4xl mx-auto space-y-8" aria-hidden="true">
        <header className="flex items-start justify-between gap-4 flex-wrap">
          <div className="flex items-center gap-4">
            <IconButton bordered disabled aria-label="Back to Dashboard">
              <ArrowLeft size={20} />
            </IconButton>
            <div className="space-y-2">
              <Skeleton className="h-8 w-48" />
              <Skeleton className="h-4 w-56" />
            </div>
          </div>
          <Skeleton className="h-9 w-40 rounded-md" />
        </header>

        <div className="space-y-4">
          <Skeleton className="h-6 w-36" />
          <div className="grid gap-6 md:grid-cols-2">
            <GoalCardSkeleton />
            <GoalCardSkeleton />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 max-w-4xl mx-auto space-y-8 animate-in fade-in duration-500">
      <header className="flex items-start justify-between gap-4 flex-wrap">
        <div className="flex items-center gap-4">
          <IconButton
            bordered
            hover="balance"
            onClick={() => {
              void navigate(-1);
            }}
            aria-label="Back to Dashboard"
          >
            <ArrowLeft size={20} />
          </IconButton>
          <div>
            <h1 className="text-3xl font-bold tracking-tight text-slate-900 dark:text-white">
              Savings Goals
            </h1>
            <p className="text-slate-500 dark:text-slate-400 font-medium">
              Plan and track your group savings goals
            </p>
          </div>
        </div>
        <Button
          variant="cta"
          onClick={() => {
            setCreateOpen(true);
          }}
        >
          <Plus size={16} className="mr-1" />
          Add Savings Goal
        </Button>
      </header>

      {error && (
        <Alert
          action={{
            label: "Retry",
            onClick: () => {
              refresh();
            },
          }}
        >
          {toFriendlySavingsError(error)}
        </Alert>
      )}

      <SavingsGoalList
        goals={goals}
        onRefresh={() => {
          refresh();
        }}
      />

      <ResponsiveDialog
        open={createOpen}
        onOpenChange={setCreateOpen}
        title="New Savings Goal"
        description="We'll split the monthly contribution by each member's income share."
      >
        <SavingsGoalForm
          groupId={groupId ?? ""}
          onSuccess={() => {
            setCreateOpen(false);
            refresh();
          }}
          onCancel={() => {
            setCreateOpen(false);
          }}
        />
      </ResponsiveDialog>
    </div>
  );
}
