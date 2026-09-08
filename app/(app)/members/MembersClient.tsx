"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { removeMember } from "../../../lib/actions/member";
import type { GroupService } from "../../../lib/server/services/group";

type Group = Awaited<ReturnType<typeof GroupService.getGroupsForUser>>[number];
type Member = Awaited<ReturnType<typeof GroupService.getGroupMembers>>[number];

interface MembersClientProps {
  groupId: string | null;
  groups: Group[];
  members: Member[];
  selfId: string;
  selfName: string | null;
  isOwner: boolean;
}

/**
 * Client half of the members page (3b.8). Surfaces `removeMember` (3b.5) —
 * previously a backend-only capability with no `frontend/` caller — behind
 * an owner-or-self gate matching resource-authorization's "Member Removal
 * Authorization" requirement exactly.
 */
export function MembersClient({
  groupId,
  groups,
  members,
  selfId,
  selfName,
  isOwner,
}: MembersClientProps) {
  const [pendingId, setPendingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  if (!groupId) {
    return (
      <div className="p-4 md:p-8 max-w-4xl mx-auto space-y-4">
        <h1 className="text-3xl font-semibold tracking-tight text-slate-900 dark:text-white">
          Members
        </h1>
        <p className="text-slate-500">Choose a group to see its members.</p>
        <ul className="flex flex-col gap-2">
          {groups.map((group) => (
            <li key={group.id}>
              <Link
                href={`/members?groupId=${group.id}`}
                className="text-brand-balance hover:underline font-medium"
              >
                {group.name}
              </Link>
            </li>
          ))}
        </ul>
      </div>
    );
  }

  const handleRemove = async (memberId: string) => {
    setPendingId(memberId);
    setError(null);

    const result = await removeMember({ groupId, memberId });
    setPendingId(null);

    if (!result.ok) {
      setError(result.error);
      return;
    }
    router.refresh();
  };

  return (
    <div className="p-4 md:p-8 max-w-4xl mx-auto space-y-6">
      <h1 className="text-3xl font-semibold tracking-tight text-slate-900 dark:text-white">
        Members
      </h1>

      {error && <p className="text-sm text-red-600">{error}</p>}

      <ul className="flex flex-col gap-3">
        {members.map((member) => {
          const isSelf = member.userId === selfId;
          const canRemove = isOwner || isSelf;
          return (
            <li
              key={member.id}
              className="flex items-center justify-between rounded-2xl border border-slate-200 dark:border-slate-800 bg-card p-4"
            >
              <span className="font-medium text-slate-900 dark:text-white">
                {isSelf
                  ? (selfName ?? member.user.name ?? member.user.email)
                  : (member.user.name ?? member.user.email)}
                {isSelf && " (you)"}
              </span>
              {canRemove && (
                <button
                  type="button"
                  disabled={pendingId === member.id}
                  onClick={() => void handleRemove(member.id)}
                  className="text-sm text-red-600 hover:underline disabled:opacity-60"
                >
                  {isSelf ? "Leave" : "Remove"}
                </button>
              )}
            </li>
          );
        })}
      </ul>
    </div>
  );
}
