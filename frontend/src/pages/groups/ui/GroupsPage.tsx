import { Plus, Users, ChevronRight } from "lucide-react";
import { Link } from "react-router-dom";
import { useState, useEffect } from "react";
import { groupApi, type Group } from "../../../entities/group";
import { CreateGroupForm } from "../../../features/groups/CreateGroupForm";
import { Card } from "../../../shared/ui/Card";
import {
  Alert,
  Button,
  Avatar,
  AvatarGroup,
  ResponsiveDialog,
  Skeleton,
} from "../../../shared/ui";
import {
  formatCurrency,
  formatCurrencyCompact,
} from "../../../shared/api/dashboardUtils";

/** Sum of every member's monthly income — the card's "Group Income" figure. */
function groupIncome(group: Group): number {
  return group.members.reduce((sum, m) => sum + m.income, 0);
}

export function GroupsPage() {
  const [groups, setGroups] = useState<Group[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isCreatingGroup, setIsCreatingGroup] = useState(false);

  const fetchGroups = async () => {
    try {
      const data = await groupApi.list();
      setGroups(data);
      setError(null);
    } catch (err: unknown) {
      console.error(
        "Failed to fetch groups",
        err instanceof Error ? err.message : String(err),
      );
      setError("Couldn't load your groups. Please try refreshing.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void fetchGroups();
  }, []);

  return (
    <div className="p-4 md:p-8 max-w-4xl mx-auto space-y-8">
      <header className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-3xl font-semibold tracking-tight text-slate-900 dark:text-white">
            My Groups
          </h1>
          <p className="mt-1 text-sm text-slate-500">
            Select a group to view your dashboard
          </p>
        </div>

        <Button
          variant="outline"
          onClick={() => {
            setIsCreatingGroup(true);
          }}
        >
          <Plus size={18} />
          <span>New Group</span>
        </Button>
      </header>

      {error && (
        <Alert
          action={{
            label: "Retry",
            onClick: () => {
              setLoading(true);
              void fetchGroups();
            },
          }}
        >
          {error}
        </Alert>
      )}

      <ResponsiveDialog
        open={isCreatingGroup}
        onOpenChange={setIsCreatingGroup}
        title="Create New Group"
        description="Set up a new shared budgeting group."
        hideCloseButton
      >
        <CreateGroupForm
          onCreated={() => {
            setIsCreatingGroup(false);
            void fetchGroups();
          }}
          onCancel={() => {
            setIsCreatingGroup(false);
          }}
        />
      </ResponsiveDialog>

      {loading ? (
        <div className="flex flex-col gap-4" aria-hidden="true">
          {Array.from({ length: 3 }, (_, i) => (
            <div
              key={i}
              className="flex flex-col gap-5 rounded-2xl border border-slate-200 dark:border-slate-800 bg-card p-5 shadow-sm sm:flex-row sm:items-center sm:justify-between sm:gap-4 sm:p-6"
            >
              <div className="flex min-w-0 items-center gap-4">
                <Skeleton className="h-[52px] w-[52px] flex-none rounded-2xl" />
                <div className="flex flex-col gap-2">
                  <Skeleton className="h-5 w-40" />
                  <Skeleton className="h-3.5 w-28" />
                </div>
              </div>
              <div className="flex flex-none items-center justify-between gap-4 sm:justify-end">
                <div className="flex flex-col items-end gap-2">
                  <Skeleton className="h-2.5 w-20" />
                  <Skeleton className="h-4 w-16" />
                </div>
                <div className="flex -space-x-2">
                  <Skeleton className="h-[34px] w-[34px] rounded-full ring-2 ring-card" />
                  <Skeleton className="h-[34px] w-[34px] rounded-full ring-2 ring-card" />
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="flex flex-col gap-4">
          {groups.map((group) => {
            const income = groupIncome(group);
            return (
              <Link
                key={group.id}
                to={`/dashboard/${group.id}`}
                className="group flex flex-col gap-5 rounded-2xl border border-slate-200 dark:border-slate-800 bg-card p-5 shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:border-brand-balance/50 hover:shadow-md sm:flex-row sm:items-center sm:justify-between sm:gap-4 sm:p-6"
              >
                <div className="flex min-w-0 items-center gap-4">
                  <span className="grid h-[52px] w-[52px] flex-none place-items-center rounded-2xl bg-brand-balance/10 text-brand-balance">
                    <Users size={24} />
                  </span>
                  <div className="min-w-0">
                    <h3 className="text-xl font-bold text-slate-900 dark:text-white [overflow-wrap:anywhere]">
                      {group.name}
                    </h3>
                    <div className="mt-0.5 flex flex-wrap items-center gap-2 text-sm text-slate-500">
                      <span className="capitalize">
                        {group.role.toLowerCase()}
                      </span>
                      <span className="h-[3px] w-[3px] rounded-full bg-slate-300 dark:bg-slate-600" />
                      <span>
                        {group.members.length}{" "}
                        {group.members.length === 1 ? "member" : "members"}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="flex flex-none items-center justify-between gap-4 sm:justify-end">
                  {income > 0 && (
                    <div className="text-right">
                      <div className="text-[0.625rem] uppercase tracking-[0.12em] text-slate-400">
                        Group Income
                      </div>
                      <div
                        className="font-mono text-sm font-semibold tabular-nums text-slate-600 dark:text-slate-300"
                        title={formatCurrency(income)}
                      >
                        {formatCurrencyCompact(income)}
                      </div>
                    </div>
                  )}
                  {group.members.length > 0 && (
                    <AvatarGroup max={3} size="sm">
                      {group.members.map((m, i) => (
                        <Avatar
                          key={m.id}
                          name={m.user?.name ?? m.user?.email ?? "?"}
                          colorIndex={i}
                          size="sm"
                        />
                      ))}
                    </AvatarGroup>
                  )}
                  <ChevronRight
                    size={20}
                    className="ml-auto text-slate-300 dark:text-slate-600 sm:ml-0"
                  />
                </div>
              </Link>
            );
          })}

          {!error && groups.length === 0 && (
            <Card className="py-12 text-center">
              <p className="text-slate-500 mb-6">
                You are not part of any groups yet.
              </p>
              <Button
                variant="cta"
                onClick={() => {
                  setIsCreatingGroup(true);
                }}
              >
                Create your first group
              </Button>
            </Card>
          )}
        </div>
      )}
    </div>
  );
}
