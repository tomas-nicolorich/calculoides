"use server";

import { z } from "zod";
import { createClient } from "../supabase/server";
import { isGroupMember } from "../server/authz";
import { ExpenseService } from "../server/services/expense";
import { toStatus } from "../server/errors";
import { ActionResult, ok, fail } from "./result";
import { CreateExpenseSchema, IdSchema } from "shared";

// Server Actions ported from `api/_src/handlers/transactions.ts`'s expense
// routes (4a.2, 4a.4). Every action returns `ActionResult<T>`, never throws
// (matches 3a.7/3b.2's precedent). `delete` is a reserved JS keyword and
// cannot be used as a function identifier, so the singular delete action is
// named `deleteExpense` (matches `ExpenseService.deleteExpense`'s own name)
// instead of the task's literal `delete`.

const UpdateExpenseSchema = z.object({
  expenseId: IdSchema,
  description: z.string().min(1),
  amount: z.number().positive(),
  date: z.string(),
  categoryId: IdSchema,
  payerId: IdSchema,
});

const DeleteExpenseSchema = z.object({
  expenseId: IdSchema,
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
// (4a.1). `categoryId` is the resource the expense is written into — like
// `group.create`'s (3a.2) caller-supplied `name`, it is legitimate input
// that has no pre-existing record of its own, but `ExpenseService.logExpense`
// still derives the group from it (`category.groupId`) and checks caller
// membership against that group internally before the write.
export async function create(
  input: unknown,
): Promise<
  ActionResult<Awaited<ReturnType<typeof ExpenseService.logExpense>>>
> {
  const userId = await getAuthenticatedUserId();
  if (!userId) return fail("Unauthorized", 403);

  const parsed = CreateExpenseSchema.safeParse(input);
  if (!parsed.success) return fail("Invalid expense", 400);

  try {
    const expense = await ExpenseService.logExpense(
      parsed.data.categoryId,
      parsed.data.payerId ?? userId,
      parsed.data.description,
      parsed.data.amount,
      parsed.data.date,
      userId,
    );
    return ok(expense);
  } catch (err) {
    return fromThrown(err);
  }
}

// resource-authorization: "Group-Scoped Budget Resources Require Membership"
// (4a.2-4a.4). This schema carries no `groupId` at all — Threat Matrix case
// 5 (cross-group id substitution) is structurally impossible to trigger via
// a caller-supplied group hint, because `ExpenseService.updateExpense`
// resolves the authorization group strictly from the *existing* expense's
// own `category.groupId`. The try/catch below is what surfaces that
// service-derived denial as a 403 `ActionResult` via `toStatus`.
export async function update(
  input: unknown,
): Promise<
  ActionResult<Awaited<ReturnType<typeof ExpenseService.updateExpense>>>
> {
  const userId = await getAuthenticatedUserId();
  if (!userId) return fail("Unauthorized", 403);

  const parsed = UpdateExpenseSchema.safeParse(input);
  if (!parsed.success) return fail("Invalid expense update", 400);

  try {
    const updated = await ExpenseService.updateExpense(
      parsed.data.expenseId,
      {
        description: parsed.data.description,
        amount: parsed.data.amount,
        date: parsed.data.date,
        categoryId: parsed.data.categoryId,
        payerId: parsed.data.payerId,
      },
      userId,
    );
    return ok(updated);
  } catch (err) {
    return fromThrown(err);
  }
}

// Same resource-derivation precedent as {@link update}: `expenseId` is the
// only identifier accepted, and `ExpenseService.deleteExpense` derives the
// authorization group from the expense's own record (4a.3-4a.4).
export async function deleteExpense(
  input: unknown,
): Promise<ActionResult<{ success: true }>> {
  const userId = await getAuthenticatedUserId();
  if (!userId) return fail("Unauthorized", 403);

  const parsed = DeleteExpenseSchema.safeParse(input);
  if (!parsed.success) return fail("Missing expenseId", 400);

  try {
    await ExpenseService.deleteExpense(parsed.data.expenseId, userId);
    return ok({ success: true as const });
  } catch (err) {
    return fromThrown(err);
  }
}

// `ExpenseService.deleteAllExpenses(groupId)` performs no membership check
// of its own (unlike `updateExpense`/`deleteExpense`, it never receives a
// caller identity) — the caller-supplied `groupId` here is legitimate input
// (same class as `create`'s `categoryId`), but MUST be membership-checked at
// the action layer before the bulk delete runs, mirroring the legacy
// `requireGroupAccess` guard in `api/_src/handlers/transactions.ts`'s
// `expenses-delete-all` route.
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
    const result = await ExpenseService.deleteAllExpenses(parsed.data.groupId);
    return ok(result);
  } catch (err) {
    return fromThrown(err);
  }
}
