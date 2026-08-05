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
