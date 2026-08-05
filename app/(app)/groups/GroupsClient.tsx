"use client";

import { useState, type SyntheticEvent } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { create } from "../../../lib/actions/group";
import type { GroupService } from "../../../lib/server/services/group";

type Group = Awaited<ReturnType<typeof GroupService.getGroupsForUser>>[number];

/**
 * Client half of the groups list (3b.8). Lean port of
 * `frontend/src/pages/groups/ui/GroupsPage.tsx` — plain Tailwind, no
 * `shared/ui` atom imports, same "lean, not a full port" precedent as
 * `app/(auth)/login/LoginForm.tsx` (1a.6).
 */
export function GroupsClient({ groups }: { groups: Group[] }) {
  const [isCreating, setIsCreating] = useState(false);
  const [name, setName] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const handleCreate = async (event: SyntheticEvent) => {
    event.preventDefault();
    setLoading(true);
    setError(null);

    const result = await create({ name });
    setLoading(false);

    if (!result.ok) {
      setError(result.error);
      return;
    }

    setName("");
    setIsCreating(false);
    router.refresh();
  };

  return (
    <div className="p-4 md:p-8 max-w-4xl mx-auto space-y-8">
      <header className="flex flex-wrap items-start justify-between gap-4">
        <h1 className="text-3xl font-semibold tracking-tight text-slate-900 dark:text-white">
          My Groups
        </h1>
        <button
          type="button"
          onClick={() => {
            setIsCreating((prev) => !prev);
          }}
          className="h-10 px-4 rounded-md bg-brand-balance text-white font-medium"
        >
          New Group
        </button>
      </header>

      {isCreating && (
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
            placeholder="Group name"
            autoFocus
            className="h-10 flex-1 min-w-48 rounded-md border border-slate-300 dark:border-slate-700 px-3"
          />
          <button
            type="submit"
            disabled={loading}
            className="h-10 px-4 rounded-md bg-brand-balance text-white font-medium disabled:opacity-60"
          >
            {loading ? "Creating..." : "Create"}
          </button>
          {error && <p className="text-sm text-red-600 w-full">{error}</p>}
        </form>
      )}

      {groups.length === 0 ? (
        <p className="text-slate-500">You are not part of any groups yet.</p>
      ) : (
        <ul className="flex flex-col gap-4">
          {groups.map((group) => (
            <li key={group.id}>
              <Link
                href={`/dashboard/${group.id}`}
                className="block rounded-2xl border border-slate-200 dark:border-slate-800 bg-card p-5 hover:border-brand-balance/50"
              >
                <h3 className="text-xl font-bold text-slate-900 dark:text-white">
                  {group.name}
                </h3>
                <p className="mt-1 text-sm text-slate-500">
                  {group.role.toLowerCase()} · {group.members.length}{" "}
                  {group.members.length === 1 ? "member" : "members"}
                </p>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
