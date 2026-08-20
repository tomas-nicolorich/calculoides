"use client";

import { useState } from "react";
import Link from "next/link";
import { Plus, Users, ChevronRight } from "lucide-react";
import { Card } from "../../_ui/Card";
import { Button } from "../../_ui/Button";
import { Avatar, AvatarGroup } from "../../_ui/Avatar";
import { CreateGroupForm } from "./_components/CreateGroupForm";
import {
  formatCurrency,
  formatCurrencyCompact,
} from "../../../lib/format-currency";

/** Fields the list actually renders — a narrower, easier-to-construct
 * subset of `GroupService.getGroupsForUser`'s return type (structurally
 * compatible, so the Server Component can still pass its full rows). */
export interface GroupListItem {
  id: string;
  name: string;
  role: string;
  members: {
    id: string;
    income: number;
    user: { name: string | null; email: string };
  }[];
}

/** Sum of every member's monthly income — the card's "Group Income" figure. */
function groupIncome(group: GroupListItem): number {
  return group.members.reduce((sum, m) => sum + m.income, 0);
}

/**
 * Client half of the groups list (PR 11, ADR-0008 parity). The card is
 * built from `app/_ui` `Card` instead of the plain `<li>`/`<Link>` markup
 * (task 11.2), and creation is delegated to `CreateGroupForm` (task 11.6 —
 * the inline `name`/`error`/`loading` state moved into that component).
 */
export function GroupsClient({
  groups: initialGroups,
}: {
  groups: GroupListItem[];
}) {
  const [groups, setGroups] = useState(initialGroups);
  const [isCreating, setIsCreating] = useState(false);

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
          type="button"
          variant="outline"
          leadingIcon={<Plus size={18} />}
          onClick={() => {
            setIsCreating((prev) => !prev);
          }}
        >
          New Group
        </Button>
      </header>

      {isCreating && (
        <CreateGroupForm
          onCreated={(group) => {
            setGroups((prev) => [
              ...prev,
              { id: group.id, name: group.name, role: "OWNER", members: [] },
            ]);
            setIsCreating(false);
          }}
        />
      )}

      {groups.length === 0 ? (
        <EmptyGroupsState
          onCreate={() => {
            setIsCreating(true);
          }}
        />
      ) : (
        <div className="flex flex-col gap-4">
          {groups.map((group) => {
            const income = groupIncome(group);
            return (
              <Link
                key={group.id}
                href={`/dashboard/${group.id}`}
                className="block"
              >
                <Card
                  hover
                  className="flex flex-col gap-5 hover:-translate-y-0.5 hover:border-brand-balance/50 sm:flex-row sm:items-center sm:justify-between sm:gap-4"
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
                            name={m.user.name ?? m.user.email}
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
                </Card>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}

function EmptyGroupsState({ onCreate }: { onCreate: () => void }) {
  return (
    <Card className="py-12 text-center">
      <p className="text-slate-500 mb-6">You are not part of any groups yet.</p>
      <Button type="button" variant="cta" onClick={onCreate}>
        Create your first group
      </Button>
    </Card>
  );
}
