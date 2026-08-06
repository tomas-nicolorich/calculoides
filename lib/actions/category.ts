"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { createClient } from "../supabase/server";
import { isGroupMember, isGroupOwner } from "../server/authz";
import { BudgetService } from "../server/services/budget";
import { toStatus } from "../server/errors";
import { ActionResult, ok, fail } from "./result";
import { CreateCategorySchema, IdSchema } from "shared";

// Server Actions ported from `api/_src/handlers/transactions.ts`'s category
// routes (4b.2). Every action returns `ActionResult<T>`, never throws
// (matches 3a.7/4a.2's precedent). `delete` is a reserved JS keyword and
// cannot be used as a function identifier, so the delete action is named
// `deleteCategory` — same resolution 4a.2 applied to `deleteExpense`.

const CreateCategoryInputSchema = CreateCategorySchema.extend({
  groupId: IdSchema,
});

const UpdateCategoryInputSchema = CreateCategorySchema.extend({
  categoryId: IdSchema,
});

const DeleteCategorySchema = z.object({
  categoryId: IdSchema,
});

async function getAuthenticatedUserId(): Promise<string | null> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return user?.id ?? null;
}

function fromThrown<T>(err: unknown): ActionResult<T> {
  const message = err instanceof Error ? err.message : String(err);
  return fail(message, toStatus(message));
}

// resource-authorization: "Group-Scoped Budget Resources Require
// Membership". `BudgetService.createCategory` performs NO membership check
// of its own (unlike `ExpenseService.logExpense`) — same pre-existing gap
// 4a.4 found for `deleteAllExpenses`, so the action enforces membership
// itself before the write. `groupId` here is legitimate, directly-scoped
// input, same class as `expense.create`'s `categoryId` (4a.1).
export async function create(
  input: unknown,
): Promise<
  ActionResult<Awaited<ReturnType<typeof BudgetService.createCategory>>>
> {
  const userId = await getAuthenticatedUserId();
  if (!userId) return fail("Unauthorized", 403);

  const parsed = CreateCategoryInputSchema.safeParse(input);
  if (!parsed.success) return fail("Invalid category", 400);

  const isMember = await isGroupMember(userId, parsed.data.groupId);
  if (!isMember) return fail("Access denied to this group", 403);

  try {
    const category = await BudgetService.createCategory(
      parsed.data.groupId,
      parsed.data.name,
      parsed.data.monthlyBudget,
      parsed.data.icon ?? undefined,
      parsed.data.memberIds,
    );
    // client-data-cache: "Mutations Invalidate Group-Scoped Queries by Key
    // Prefix" — revalidates the Dashboard Server Component route, which
    // renders this group's categories-list/summary (4b.7).
    revalidatePath(`/dashboard/${parsed.data.groupId}`);
    return ok(category);
  } catch (err) {
    return fromThrown(err);
  }
}

// `BudgetService.updateCategory` already derives the group from the
// *existing* category's own record and checks caller membership internally
// (throws "Category not found" / "Not a member of this group") — same
// non-duplication precedent 3a.4/4a.4 established for surfacing a
// service-owned check via `toStatus` rather than duplicating it.
export async function update(
  input: unknown,
): Promise<
  ActionResult<Awaited<ReturnType<typeof BudgetService.updateCategory>>>
> {
  const userId = await getAuthenticatedUserId();
  if (!userId) return fail("Unauthorized", 403);

  const parsed = UpdateCategoryInputSchema.safeParse(input);
  if (!parsed.success) return fail("Invalid category update", 400);

  try {
    const category = await BudgetService.updateCategory(
      parsed.data.categoryId,
      parsed.data.name,
      parsed.data.monthlyBudget,
      userId,
      parsed.data.icon ?? undefined,
      parsed.data.memberIds,
    );
    revalidatePath(`/dashboard/${category.groupId}`);
    return ok(category);
  } catch (err) {
    return fromThrown(err);
  }
}

// resource-authorization: "Category Deletion Requires Ownership" (4b.1-4b.2)
// — ports the owner-only check at `api/_src/handlers/transactions.ts:389`
// (`GroupService.isOwner(category.groupId, authReq.user.id)`). The group is
// resolved from the category's own record via
// `BudgetService.getCategoryById`, never a caller-supplied value — same
// resource-derivation precedent as `member.ts`'s `removeMember` (3b.5).
export async function deleteCategory(
  input: unknown,
): Promise<ActionResult<{ success: true }>> {
  const userId = await getAuthenticatedUserId();
  if (!userId) return fail("Unauthorized", 403);

  const parsed = DeleteCategorySchema.safeParse(input);
  if (!parsed.success) return fail("Missing categoryId", 400);

  const category = await BudgetService.getCategoryById(parsed.data.categoryId);
  if (!category) return fail("Category not found", 404);

  const isOwner = await isGroupOwner(userId, category.groupId);
  if (!isOwner) {
    return fail("Only group owners can delete categories", 403);
  }

  try {
    await BudgetService.deleteCategory(parsed.data.categoryId);
    revalidatePath(`/dashboard/${category.groupId}`);
    return ok({ success: true as const });
  } catch (err) {
    return fromThrown(err);
  }
}
