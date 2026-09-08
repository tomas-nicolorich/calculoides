"use server";

import { z } from "zod";
import { isGroupOwner } from "../server/authz";
import { GroupService } from "../server/services/group";
import { ActionResult, ok, fail, fromThrown } from "./result";
import { getAuthenticatedUserId } from "./session";
import { IdSchema } from "shared";

// Server Actions ported from `api/_src/handlers/members.ts` (3b.2, 3b.5).
// Every action returns `ActionResult<T>`, never throws (matches 3a.7).

const UpdateIncomeSchema = z.object({
  memberId: IdSchema,
  income: z.number().nonnegative(),
});

const RemoveMemberSchema = z.object({
  groupId: IdSchema,
  memberId: IdSchema,
});

// resource-authorization: "Member Income Update Requires Membership" (3b.1).
// `GroupService.updateMemberIncome` performs its own owner-or-member check
// against the target member's `groupId` internally (throws "Unauthorized:
// not a member of this group" for an outsider) — this action surfaces that
// as a 403 `ActionResult` via `toStatus`, the same non-duplication precedent
// 3a.4 established for `archive`/`undoArchive`.
export async function updateIncome(
  input: unknown,
): Promise<
  ActionResult<Awaited<ReturnType<typeof GroupService.updateMemberIncome>>>
> {
  const userId = await getAuthenticatedUserId();
  if (!userId) return fail("Unauthorized", 403);

  const parsed = UpdateIncomeSchema.safeParse(input);
  if (!parsed.success) return fail("Missing memberId or invalid income", 400);

  try {
    const member = await GroupService.updateMemberIncome(
      userId,
      parsed.data.memberId,
      parsed.data.income,
    );
    return ok(member);
  } catch (err) {
    return fromThrown(err);
  }
}

// resource-authorization: "Member Removal Authorization Is Derived From the
// Target Member's Own Group" (3b.3-3b.5). Threat Matrix case 5: a caller may
// pass a `groupId` alongside `memberId`, but authorization is derived only
// from the target member's *actual* `groupId` (`GroupService.getMemberById`),
// never from `input.groupId` — the exact precedent at
// `api/_src/handlers/members.ts:78`.
export async function removeMember(
  input: unknown,
): Promise<ActionResult<{ success: true }>> {
  const userId = await getAuthenticatedUserId();
  if (!userId) return fail("Unauthorized", 403);

  const parsed = RemoveMemberSchema.safeParse(input);
  if (!parsed.success) return fail("Missing groupId or memberId", 400);

  const member = await GroupService.getMemberById(parsed.data.memberId);
  if (!member) return fail("Member not found", 404);

  const isOwner = await isGroupOwner(userId, member.groupId);
  const isSelf = member.userId === userId;
  if (!isOwner && !isSelf) {
    return fail("Only the owner can remove other members", 403);
  }

  try {
    await GroupService.removeMember(member.groupId, parsed.data.memberId);
    return ok({ success: true as const });
  } catch (err) {
    return fromThrown(err);
  }
}
