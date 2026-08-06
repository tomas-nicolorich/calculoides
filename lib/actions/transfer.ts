"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { createClient } from "../supabase/server";
import { isGroupMember } from "../server/authz";
import { TransferService } from "../server/services/transfer";
import { BudgetService } from "../server/services/budget";
import { toStatus } from "../server/errors";
import { ActionResult, ok, fail } from "./result";
import { IdSchema } from "shared";

// Server Actions ported from `api/_src/handlers/transactions.ts`'s transfer
// routes (5.2, 5.4). Every action returns `ActionResult<T>`, never throws
// (matches 4a.2/4b.2's precedent). `delete` is a reserved JS keyword and
// cannot be used as a function identifier, so the singular delete action is
// named `deleteTransfer` — same resolution 4a.2 applied to `deleteExpense`
// and 4b.2 to `deleteCategory`.
//
// Each successful mutation revalidates the Dashboard Server Component route
// for its own group (client-data-cache: "Mutations Invalidate Group-Scoped
// Queries by Key Prefix"); client-side `["group", groupId]` cache
// invalidation is wired where these actions are invoked from a Client
// Component (`app/(app)/transfers/[groupId]/queries.ts`, 5.8).

const CreateTransferSchema = z.object({
  categoryId: IdSchema,
  fromMemberId: IdSchema,
  toMemberId: IdSchema,
  amount: z.number().positive(),
});

const DeleteTransferSchema = z.object({
  transferId: IdSchema,
});

const DeleteAllSchema = z.object({
  groupId: IdSchema,
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

// resource-authorization: "Group-Scoped Budget Resources Require Membership"
// (5.1). `categoryId` is the resource the transfer is written into — like
// `expense.create`'s `categoryId` (4a.1), it is legitimate input with no
// pre-existing record of its own, but `TransferService.createTransfer` still
// derives the group from it (`category.groupId`) and checks caller
// membership against that group internally before the write.
export async function create(
  input: unknown,
): Promise<
  ActionResult<Awaited<ReturnType<typeof TransferService.createTransfer>>>
> {
  const userId = await getAuthenticatedUserId();
  if (!userId) return fail("Unauthorized", 403);

  const parsed = CreateTransferSchema.safeParse(input);
  if (!parsed.success) return fail("Invalid transfer", 400);

  try {
    const transfer = await TransferService.createTransfer(
      parsed.data.categoryId,
      parsed.data.fromMemberId,
      parsed.data.toMemberId,
      parsed.data.amount,
      userId,
    );
    const category = await BudgetService.getCategoryById(
      parsed.data.categoryId,
    );
    if (category) revalidatePath(`/dashboard/${category.groupId}`);
    return ok(transfer);
  } catch (err) {
    return fromThrown(err);
  }
}

// Threat Matrix case 5 (cross-group id substitution, 5.3-5.4): this schema
// carries no `groupId` at all — `TransferService.deleteTransfer` resolves
// the authorization group strictly from the *existing* transfer's own
// `category.groupId`, never from a caller-supplied value. Same
// resource-derivation precedent as `expense.ts`'s `deleteExpense` (4a.3-4a.4).
export async function deleteTransfer(
  input: unknown,
): Promise<ActionResult<{ success: true }>> {
  const userId = await getAuthenticatedUserId();
  if (!userId) return fail("Unauthorized", 403);

  const parsed = DeleteTransferSchema.safeParse(input);
  if (!parsed.success) return fail("Missing transferId", 400);

  // Resolved BEFORE the delete runs — `transferId` has no `groupId` field of
  // its own, and the row is gone once `deleteTransfer` succeeds, so this is
  // the only revalidation source available (mirrors `deleteExpense`, 4b.7).
  const groupId = await TransferService.getTransferGroupId(
    parsed.data.transferId,
  );

  try {
    await TransferService.deleteTransfer(parsed.data.transferId, userId);
    if (groupId) revalidatePath(`/dashboard/${groupId}`);
    return ok({ success: true as const });
  } catch (err) {
    return fromThrown(err);
  }
}

// `TransferService.deleteAllTransfers(groupId)` performs no membership check
// of its own (unlike `createTransfer`/`deleteTransfer`, it never receives a
// caller identity) — the caller-supplied `groupId` here is legitimate input
// (same class as `expense.ts`'s `deleteAll`, 4a.4), but MUST be
// membership-checked at the action layer before the bulk delete runs,
// mirroring the legacy `requireGroupAccess` guard in
// `api/_src/handlers/transactions.ts`'s `transfers-delete-all` route.
export async function deleteAll(
  input: unknown,
): Promise<ActionResult<{ count: number }>> {
  const userId = await getAuthenticatedUserId();
  if (!userId) return fail("Unauthorized", 403);

  const parsed = DeleteAllSchema.safeParse(input);
  if (!parsed.success) return fail("Missing groupId", 400);

  const isMember = await isGroupMember(userId, parsed.data.groupId);
  if (!isMember) return fail("Access denied to this group", 403);

  try {
    const result = await TransferService.deleteAllTransfers(
      parsed.data.groupId,
    );
    revalidatePath(`/dashboard/${parsed.data.groupId}`);
    return ok(result);
  } catch (err) {
    return fromThrown(err);
  }
}
