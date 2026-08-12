"use client";

import { useState } from "react";
import Link from "next/link";
import { Card } from "../../_ui/Card";
import { Button } from "../../_ui/Button";
import { CreateGroupForm } from "./_components/CreateGroupForm";

/** Fields the list actually renders — a narrower, easier-to-construct
 * subset of `GroupService.getGroupsForUser`'s return type (structurally
 * compatible, so the Server Component can still pass its full rows). */
export interface GroupListItem {
  id: string;
  name: string;
  role: string;
  members: { id: string }[];
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
        <h1 className="text-3xl font-semibold tracking-tight text-slate-900 dark:text-white">
          My Groups
        </h1>
        <Button
          type="button"
          variant="outline"
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
          {groups.map((group) => (
            <Link
              key={group.id}
              href={`/dashboard/${group.id}`}
              className="block"
            >
              <Card
                hover
                className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between"
              >
                <h3 className="text-xl font-bold text-slate-900 dark:text-white [overflow-wrap:anywhere]">
                  {group.name}
                </h3>
                <p className="text-sm text-slate-500">
                  {group.role.toLowerCase()} · {group.members.length}{" "}
                  {group.members.length === 1 ? "member" : "members"}
                </p>
              </Card>
            </Link>
          ))}
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
