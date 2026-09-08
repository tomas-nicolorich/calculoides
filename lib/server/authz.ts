import { notFound } from "next/navigation";
import { createClient } from "../supabase/server";
import { GroupService } from "./services/group";

/**
 * resource-authorization: "Group-Scoped Budget Resources Require Membership"
 * — the shared membership check for Server Components and Route Handlers
 * serving group-scoped budget reads (summary, categories, and future
 * expenses/transfers/savings GET handlers). Mirrors the legacy
 * `requireGroupAccess` helper in `api/_src/handlers/transactions.ts`, which
 * resolves membership the same way via `GroupService.getGroupsForUser`.
 */
export async function isGroupMember(
  userId: string,
  groupId: string,
): Promise<boolean> {
  const groups = await GroupService.getGroupsForUser(userId);
  return groups.some((g) => g.id === groupId);
}

/**
 * resource-authorization Threat Matrix case 4 (non-owner `transferOwnership`
 * denial) — mirrors the exact ownership-check precedent at
 * `api/_src/handlers/groups.ts:80` (`GroupService.isOwner(groupId,
 * authReq.user.id)`), lifted here so Server Actions share one owner-check
 * helper alongside `isGroupMember` instead of re-deriving it per action.
 */
export async function isGroupOwner(
  userId: string,
  groupId: string,
): Promise<boolean> {
  return GroupService.isOwner(groupId, userId);
}

/**
 * resource-authorization: "Group-Scoped Budget Resources Require Membership"
 * — shared route-guard helper for group-scoped Server Components. Collapses
 * the `createClient` → `getUser` → `isGroupMember` boilerplate duplicated
 * across the Dashboard/Expenses/Savings/Transfers pages into a single call.
 * `notFound()` fires both when there's no session and when the user isn't a
 * group member, so the response never leaks which case occurred.
 */
export async function requireGroupMember(
  groupId: string,
): Promise<{ userId: string }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    notFound();
  }

  const isMember = await isGroupMember(user.id, groupId);
  if (!isMember) {
    notFound();
  }

  return { userId: user.id };
}
