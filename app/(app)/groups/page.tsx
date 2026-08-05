import { notFound } from "next/navigation";
import { createClient } from "../../../lib/supabase/server";
import { GroupService } from "../../../lib/server/services/group";
import { GroupsClient } from "./GroupsClient";

/**
 * Server Component for the groups list (3b.8; design.md: "Server Component
 * (no endpoint)" row for groups `list`). Lean port of
 * `frontend/src/pages/groups/ui/GroupsPage.tsx` — no `HydrationBoundary`/
 * TanStack prefetch, since this read has no query key of its own (matches
 * `groups list`'s row in the Server Action vs Route Handler table, same
 * shape as `app/(app)/layout.tsx`'s TODO'd group-list read). No caller input
 * is possible at this layer, so `GroupService.getGroupsForUser` is always
 * called with the session's own id.
 */
export default async function GroupsPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    notFound();
  }

  const groups = await GroupService.getGroupsForUser(user.id);

  return <GroupsClient groups={groups} />;
}
