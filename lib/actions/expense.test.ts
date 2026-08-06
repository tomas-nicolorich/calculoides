import { describe, it, expect, vi, beforeEach } from "vitest";

// Same mocking conventions as `lib/actions/group.test.ts` / `member.test.ts`.
const {
  getUserMock,
  isGroupMemberMock,
  logExpenseMock,
  updateExpenseMock,
  deleteExpenseMock,
  deleteAllExpensesMock,
  getExpenseGroupIdMock,
  getCategoryByIdMock,
  revalidatePathMock,
} = vi.hoisted(() => ({
  getUserMock: vi.fn(),
  isGroupMemberMock: vi.fn(),
  logExpenseMock: vi.fn(),
  updateExpenseMock: vi.fn(),
  deleteExpenseMock: vi.fn(),
  deleteAllExpensesMock: vi.fn(),
  getExpenseGroupIdMock: vi.fn(),
  getCategoryByIdMock: vi.fn(),
  revalidatePathMock: vi.fn(),
}));

vi.mock("../supabase/server", () => ({
  createClient: vi.fn(() =>
    Promise.resolve({ auth: { getUser: getUserMock } }),
  ),
}));

vi.mock("../server/authz", () => ({
  isGroupMember: isGroupMemberMock,
}));

vi.mock("../server/services/expense", () => ({
  ExpenseService: {
    logExpense: logExpenseMock,
    updateExpense: updateExpenseMock,
    deleteExpense: deleteExpenseMock,
    deleteAllExpenses: deleteAllExpensesMock,
    getExpenseGroupId: getExpenseGroupIdMock,
  },
}));

vi.mock("../server/services/budget", () => ({
  BudgetService: {
    getCategoryById: getCategoryByIdMock,
  },
}));

vi.mock("next/cache", () => ({
  revalidatePath: revalidatePathMock,
}));

import { create, update, deleteExpense, deleteAll } from "./expense";

const USER_ID = "11111111-1111-4111-8111-111111111111";
const GROUP_ID = "22222222-2222-4222-8222-222222222222";
const CATEGORY_ID = "33333333-3333-4333-8333-333333333333";
const EXPENSE_ID = "44444444-4444-4444-8444-444444444444";
const PAYER_ID = "55555555-5555-4555-8555-555555555555";

// resource-authorization: "Group-Scoped Budget Resources Require Membership"
// (4a.1) — `ExpenseService.logExpense` derives the group from `categoryId`
// (the resource being written into) and checks caller membership against it
// internally; the action surfaces that denial as a 403 `ActionResult`.
describe("create", () => {
  beforeEach(() => {
    getUserMock.mockReset();
    logExpenseMock.mockReset();
    getCategoryByIdMock.mockReset();
    revalidatePathMock.mockReset();
  });

  // client-data-cache: "Mutations Invalidate Group-Scoped Queries by Key
  // Prefix" — a successful create revalidates the Dashboard route for the
  // expense's own group, resolved via `BudgetService.getCategoryById`
  // (4b.7).
  it("creates an expense for a member of the category's group", async () => {
    getUserMock.mockResolvedValue({ data: { user: { id: USER_ID } } });
    logExpenseMock.mockResolvedValue({
      id: EXPENSE_ID,
      categoryId: CATEGORY_ID,
      amount: 25.5,
    });
    getCategoryByIdMock.mockResolvedValue({
      id: CATEGORY_ID,
      groupId: GROUP_ID,
    });

    const result = await create({
      categoryId: CATEGORY_ID,
      description: "Groceries",
      amount: 25.5,
      date: "2026-08-01",
    });

    expect(result).toEqual({
      ok: true,
      data: { id: EXPENSE_ID, categoryId: CATEGORY_ID, amount: 25.5 },
    });
    expect(logExpenseMock).toHaveBeenCalledWith(
      CATEGORY_ID,
      USER_ID,
      "Groceries",
      25.5,
      new Date("2026-08-01"),
      USER_ID,
    );
    expect(revalidatePathMock).toHaveBeenCalledWith(`/dashboard/${GROUP_ID}`);
  });

  it("denies a non-member with 403 via the service's membership check", async () => {
    getUserMock.mockResolvedValue({ data: { user: { id: USER_ID } } });
    logExpenseMock.mockRejectedValue(new Error("Not a member of this group"));

    const result = await create({
      categoryId: CATEGORY_ID,
      description: "Groceries",
      amount: 25.5,
      date: "2026-08-01",
    });

    expect(result).toEqual({
      ok: false,
      error: "Not a member of this group",
      status: 403,
    });
  });

  it("rejects an unauthenticated caller with 403 and never touches the service", async () => {
    getUserMock.mockResolvedValue({ data: { user: null } });

    const result = await create({
      categoryId: CATEGORY_ID,
      description: "Groceries",
      amount: 25.5,
      date: "2026-08-01",
    });

    expect(result).toEqual({ ok: false, error: "Unauthorized", status: 403 });
    expect(logExpenseMock).not.toHaveBeenCalled();
    expect(revalidatePathMock).not.toHaveBeenCalled();
  });
});

// Threat Matrix case 5 (cross-group id substitution): `updateExpense` takes
// no `groupId` at all — `ExpenseService.updateExpense` resolves the
// authorization group from the *existing* expense's own `category.groupId`,
// never from a caller-supplied value. These assert the action surfaces that
// service-derived denial as a 403 `ActionResult` (4a.3-4a.4).
describe("update", () => {
  beforeEach(() => {
    getUserMock.mockReset();
    updateExpenseMock.mockReset();
    getCategoryByIdMock.mockReset();
    revalidatePathMock.mockReset();
  });

  it("updates the expense for a member of its own group", async () => {
    getUserMock.mockResolvedValue({ data: { user: { id: USER_ID } } });
    updateExpenseMock.mockResolvedValue({
      id: EXPENSE_ID,
      description: "Rent",
      amount: 900,
    });
    getCategoryByIdMock.mockResolvedValue({
      id: CATEGORY_ID,
      groupId: GROUP_ID,
    });

    const result = await update({
      expenseId: EXPENSE_ID,
      description: "Rent",
      amount: 900,
      date: "2026-08-01",
      categoryId: CATEGORY_ID,
      payerId: PAYER_ID,
    });

    expect(result).toEqual({
      ok: true,
      data: { id: EXPENSE_ID, description: "Rent", amount: 900 },
    });
    expect(updateExpenseMock).toHaveBeenCalledWith(
      EXPENSE_ID,
      {
        description: "Rent",
        amount: 900,
        date: "2026-08-01",
        categoryId: CATEGORY_ID,
        payerId: PAYER_ID,
      },
      USER_ID,
    );
    expect(revalidatePathMock).toHaveBeenCalledWith(`/dashboard/${GROUP_ID}`);
  });

  it("rejects cross-group id substitution: caller is not a member of the expense's actual group", async () => {
    getUserMock.mockResolvedValue({ data: { user: { id: USER_ID } } });
    updateExpenseMock.mockRejectedValue(
      new Error("Not a member of this group"),
    );

    const result = await update({
      expenseId: EXPENSE_ID,
      description: "Rent",
      amount: 900,
      date: "2026-08-01",
      categoryId: CATEGORY_ID,
      payerId: PAYER_ID,
    });

    expect(result).toEqual({
      ok: false,
      error: "Not a member of this group",
      status: 403,
    });
    expect(revalidatePathMock).not.toHaveBeenCalled();
  });

  it("returns 404 when the expense does not exist", async () => {
    getUserMock.mockResolvedValue({ data: { user: { id: USER_ID } } });
    updateExpenseMock.mockRejectedValue(new Error("Expense not found"));

    const result = await update({
      expenseId: EXPENSE_ID,
      description: "Rent",
      amount: 900,
      date: "2026-08-01",
      categoryId: CATEGORY_ID,
      payerId: PAYER_ID,
    });

    expect(result).toEqual({
      ok: false,
      error: "Expense not found",
      status: 404,
    });
    expect(revalidatePathMock).not.toHaveBeenCalled();
  });
});

describe("deleteExpense", () => {
  beforeEach(() => {
    getUserMock.mockReset();
    deleteExpenseMock.mockReset();
    getExpenseGroupIdMock.mockReset();
    revalidatePathMock.mockReset();
  });

  // `getExpenseGroupId` resolves the group BEFORE the delete runs, since
  // `expenseId` has no `groupId` field of its own and the row is gone
  // afterward — the only revalidation source available to this action
  // (4b.7).
  it("deletes the expense for a member of its own group", async () => {
    getUserMock.mockResolvedValue({ data: { user: { id: USER_ID } } });
    getExpenseGroupIdMock.mockResolvedValue(GROUP_ID);
    deleteExpenseMock.mockResolvedValue({ id: EXPENSE_ID });

    const result = await deleteExpense({ expenseId: EXPENSE_ID });

    expect(result).toEqual({ ok: true, data: { success: true } });
    expect(deleteExpenseMock).toHaveBeenCalledWith(EXPENSE_ID, USER_ID);
    expect(revalidatePathMock).toHaveBeenCalledWith(`/dashboard/${GROUP_ID}`);
  });

  it("rejects cross-group id substitution: caller is not a member of the expense's actual group", async () => {
    getUserMock.mockResolvedValue({ data: { user: { id: USER_ID } } });
    getExpenseGroupIdMock.mockResolvedValue(GROUP_ID);
    deleteExpenseMock.mockRejectedValue(
      new Error("Not a member of this group"),
    );

    const result = await deleteExpense({ expenseId: EXPENSE_ID });

    expect(result).toEqual({
      ok: false,
      error: "Not a member of this group",
      status: 403,
    });
    expect(revalidatePathMock).not.toHaveBeenCalled();
  });
});

// `ExpenseService.deleteAllExpenses(groupId)` performs no membership check
// of its own — the action layer MUST enforce membership itself before the
// bulk delete runs (mirrors the legacy `requireGroupAccess` guard in
// `api/_src/handlers/transactions.ts`'s `expenses-delete-all` route).
describe("deleteAll", () => {
  beforeEach(() => {
    getUserMock.mockReset();
    isGroupMemberMock.mockReset();
    deleteAllExpensesMock.mockReset();
    revalidatePathMock.mockReset();
  });

  it("deletes every expense in the group for a member", async () => {
    getUserMock.mockResolvedValue({ data: { user: { id: USER_ID } } });
    isGroupMemberMock.mockResolvedValue(true);
    deleteAllExpensesMock.mockResolvedValue({ count: 7 });

    const result = await deleteAll({ groupId: GROUP_ID });

    expect(result).toEqual({ ok: true, data: { count: 7 } });
    expect(isGroupMemberMock).toHaveBeenCalledWith(USER_ID, GROUP_ID);
    expect(deleteAllExpensesMock).toHaveBeenCalledWith(GROUP_ID);
    expect(revalidatePathMock).toHaveBeenCalledWith(`/dashboard/${GROUP_ID}`);
  });

  it("denies a non-member with 403 and never touches the service", async () => {
    getUserMock.mockResolvedValue({ data: { user: { id: USER_ID } } });
    isGroupMemberMock.mockResolvedValue(false);

    const result = await deleteAll({ groupId: GROUP_ID });

    expect(result).toEqual({
      ok: false,
      error: "Access denied to this group",
      status: 403,
    });
    expect(deleteAllExpensesMock).not.toHaveBeenCalled();
    expect(revalidatePathMock).not.toHaveBeenCalled();
  });
});
