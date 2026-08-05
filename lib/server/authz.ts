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
