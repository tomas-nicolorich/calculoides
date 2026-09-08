import { notFound } from "next/navigation";
import { createClient } from "../../../lib/supabase/server";
import { isGroupMember, isGroupOwner } from "../../../lib/server/authz";
import { GroupService } from "../../../lib/server/services/group";
import { UserService } from "../../../lib/server/services/user";
import { MembersClient } from "./MembersClient";

/**
 * Server Component for the members list (3b.8; design.md: "Server Component
 * (no endpoint)" row for `members list`). Scoped via `?groupId=` — this page
 * has no `[groupId]` dynamic segment, so a missing param renders a group
 * picker instead of defaulting to any particular group.
 *
 * resource-authorization: "Group Access Requires Membership or Ownership" —
 * `isGroupMember` gates the read, mirroring `dashboard/[groupId]/page.tsx`'s
 * `notFound()`-on-non-member precedent (2.1).
 *
 * Also wires the "users me" first-paint service call (3b.7, second clause):
 * `UserService.getUser` is called only with the session's own id — there is
 * no caller-supplied id at this layer, so "self" is structurally
 * self-scoped — used by `MembersClient` to label the caller's own row and
 * decide leave-vs-remove UI (resource-authorization: "Self-removal allowed
 * without ownership").
 */
export default async function MembersPage({
  searchParams,
}: {
  searchParams: Promise<{ groupId?: string }>;
}) {
  const { groupId } = await searchParams;

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    notFound();
  }

  if (!groupId) {
    const groups = await GroupService.getGroupsForUser(user.id);
    return (
      <MembersClient
        groupId={null}
        groups={groups}
        members={[]}
        selfId={user.id}
        selfName={null}
        isOwner={false}
      />
    );
  }

  const isMember = await isGroupMember(user.id, groupId);
  if (!isMember) {
    notFound();
  }

  const [isOwner, members, self] = await Promise.all([
    isGroupOwner(user.id, groupId),
    GroupService.getGroupMembers(groupId),
    UserService.getUser(user.id),
  ]);

  return (
    <MembersClient
      groupId={groupId}
      groups={[]}
      members={members}
      selfId={user.id}
      selfName={self?.name ?? null}
      isOwner={isOwner}
    />
  );
}
