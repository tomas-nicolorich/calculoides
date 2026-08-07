"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { isGroupMember } from "../server/authz";
import { SavingsService } from "../server/services/savings";
import { ActionResult, ok, fail, fromThrown } from "./result";
import { getAuthenticatedUserId } from "./session";
import {
  CreateSavingsGoalSchema,
  UpsertContributionSchema,
  IdSchema,
} from "shared";

// Server Actions ported from `api/_src/handlers/transactions.ts`'s savings
// goal/contribution routes (6a.2). Every action returns `ActionResult<T>`,
// never throws (matches 3a.7/4a.2/4b.2/5.2's precedent). `delete` is a
// reserved JS keyword and cannot be used as a function identifier, so the
// singular delete action is named `deleteGoal` — same resolution 4a.2/4b.2/5.2
// applied to `deleteExpense`/`deleteCategory`/`deleteTransfer`.
//
// Each successful mutation revalidates the Dashboard Server Component route
// for its own group (client-data-cache: "Mutations Invalidate Group-Scoped
// Queries by Key Prefix"), same pattern as Phase 4a/4b/5.

const CreateGoalInputSchema = CreateSavingsGoalSchema.extend({
  groupId: IdSchema,
});

const UpdateGoalInputSchema = CreateSavingsGoalSchema.extend({
  goalId: IdSchema,
});

const DeleteGoalSchema = z.object({
  goalId: IdSchema,
});

const ContributionUpsertSchema = UpsertContributionSchema.extend({
  goalId: IdSchema,
  memberId: IdSchema,
});

const ContributionDeleteSchema = z.object({
  goalId: IdSchema,
  memberId: IdSchema,
});

// resource-authorization: "Group-Scoped Budget Resources Require Membership"
// (6a.1). `SavingsService.createGoal` performs NO membership check of its
// own (unlike `updateGoal`/`deleteGoal`) — same pre-existing gap 4b.2 found
// for `BudgetService.createCategory`, so the action enforces membership
// itself before the write. `groupId` here is legitimate, directly-scoped
// input, same class as `category.create`'s `groupId` (4b.2).
export async function create(
  input: unknown,
): Promise<
  ActionResult<Awaited<ReturnType<typeof SavingsService.createGoal>>>
> {
  const userId = await getAuthenticatedUserId();
  if (!userId) return fail("Unauthorized", 403);

  const parsed = CreateGoalInputSchema.safeParse(input);
  if (!parsed.success) return fail("Invalid savings goal", 400);

  const isMember = await isGroupMember(userId, parsed.data.groupId);
  if (!isMember) return fail("Access denied to this group", 403);

  try {
    const goal = await SavingsService.createGoal(
      parsed.data.groupId,
      parsed.data.name,
      parsed.data.targetAmount,
      parsed.data.targetDate,
      parsed.data.currentAmount,
      parsed.data.icon,
    );
    revalidatePath(`/dashboard/${parsed.data.groupId}`);
    return ok(goal);
  } catch (err) {
    return fromThrown(err);
  }
}

// `SavingsService.updateGoal` already derives the group from the *existing*
// goal's own record and checks caller membership internally (throws
// "Savings goal not found" / "Not a member of this group") — same
// non-duplication precedent 3a.4/4a.4/4b.2 established for surfacing a
// service-owned check via `toStatus` rather than duplicating it. This schema
// carries no `groupId` at all, so Threat Matrix case 5 (cross-group id
// substitution) is structurally impossible via a caller-supplied group hint.
export async function update(
  input: unknown,
): Promise<
  ActionResult<Awaited<ReturnType<typeof SavingsService.updateGoal>>>
> {
  const userId = await getAuthenticatedUserId();
  if (!userId) return fail("Unauthorized", 403);

  const parsed = UpdateGoalInputSchema.safeParse(input);
  if (!parsed.success) return fail("Invalid savings goal update", 400);

  try {
    const goal = await SavingsService.updateGoal(
      parsed.data.goalId,
      parsed.data.name,
      parsed.data.targetAmount,
      parsed.data.targetDate,
      parsed.data.currentAmount,
      userId,
      parsed.data.icon,
    );
    revalidatePath(`/dashboard/${goal.groupId}`);
    return ok(goal);
  } catch (err) {
    return fromThrown(err);
  }
}

// Same resource-derivation precedent as `expense.ts`'s `deleteExpense`
// (4a.3-4a.4) and `transfer.ts`'s `deleteTransfer` (5.3-5.4): `goalId` is
// the only identifier accepted, and `SavingsService.deleteGoal` derives the
// authorization group from the goal's own record, never a caller-supplied
// value.
export async function deleteGoal(
  input: unknown,
): Promise<ActionResult<{ success: true }>> {
  const userId = await getAuthenticatedUserId();
  if (!userId) return fail("Unauthorized", 403);

  const parsed = DeleteGoalSchema.safeParse(input);
  if (!parsed.success) return fail("Missing goalId", 400);

  // Resolved BEFORE the delete runs — `goalId` has no separate revalidation
  // source once the row is gone (mirrors `deleteExpense`/`deleteTransfer`,
  // 4b.7/5.4).
  const groupId = await SavingsService.getGoalGroupId(parsed.data.goalId);

  try {
    await SavingsService.deleteGoal(parsed.data.goalId, userId);
    if (groupId) revalidatePath(`/dashboard/${groupId}`);
    return ok({ success: true as const });
  } catch (err) {
    return fromThrown(err);
  }
}

// Threat Matrix case 5 (cross-group id substitution, 6a.3-6a.4), literal
// shape: `SavingsService.upsertContribution` validates that `goalId` and
// `memberId` belong to the SAME group before writing, and separately checks
// the caller's own membership against the goal's group — same class as
// `member.ts`'s `removeMember` cross-group test (3b.4).
export async function contributionUpsert(
  input: unknown,
): Promise<
  ActionResult<Awaited<ReturnType<typeof SavingsService.upsertContribution>>>
> {
  const userId = await getAuthenticatedUserId();
  if (!userId) return fail("Unauthorized", 403);

  const parsed = ContributionUpsertSchema.safeParse(input);
  if (!parsed.success) return fail("Invalid contribution", 400);

  const groupId = await SavingsService.getGoalGroupId(parsed.data.goalId);

  try {
    const contribution = await SavingsService.upsertContribution(
      parsed.data.goalId,
      parsed.data.memberId,
      parsed.data.amount,
      userId,
    );
    if (groupId) revalidatePath(`/dashboard/${groupId}`);
    return ok(contribution);
  } catch (err) {
    return fromThrown(err);
  }
}

// Same resource-derivation precedent as {@link contributionUpsert}:
// `SavingsService.deleteContribution` runs the identical goal/member
// same-group check before deleting the override.
export async function contributionDelete(
  input: unknown,
): Promise<ActionResult<{ success: true }>> {
  const userId = await getAuthenticatedUserId();
  if (!userId) return fail("Unauthorized", 403);

  const parsed = ContributionDeleteSchema.safeParse(input);
  if (!parsed.success) return fail("Missing goalId or memberId", 400);

  const groupId = await SavingsService.getGoalGroupId(parsed.data.goalId);

  try {
    await SavingsService.deleteContribution(
      parsed.data.goalId,
      parsed.data.memberId,
      userId,
    );
    if (groupId) revalidatePath(`/dashboard/${groupId}`);
    return ok({ success: true as const });
  } catch (err) {
    return fromThrown(err);
  }
}
