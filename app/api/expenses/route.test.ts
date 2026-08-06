import { describe, it, expect, beforeEach, vi } from "vitest";
import { NextRequest } from "next/server";

// Same mocking conventions as `app/api/categories/route.test.ts`.
const { getUserMock, isGroupMemberMock, listExpensesMock } = vi.hoisted(() => ({
  getUserMock: vi.fn(),
  isGroupMemberMock: vi.fn(),
  listExpensesMock: vi.fn(),
}));

vi.mock("../../../lib/supabase/server", () => ({
  createClient: vi.fn(() =>
    Promise.resolve({ auth: { getUser: getUserMock } }),
  ),
}));

vi.mock("../../../lib/server/authz", () => ({
  isGroupMember: isGroupMemberMock,
}));

vi.mock("../../../lib/server/services/expense", () => ({
  ExpenseService: { listExpenses: listExpensesMock },
}));

import { GET } from "./route";

function requestFor(params: Record<string, string | null>) {
  const url = new URL("/api/expenses", "http://localhost:3000");
  for (const [key, value] of Object.entries(params)) {
    if (value !== null) url.searchParams.set(key, value);
  }
  return new NextRequest(url);
}

const USER_ID = "user-1";
const GROUP_ID = "22222222-2222-4222-8222-222222222222";
const CATEGORY_ID = "33333333-3333-4333-8333-333333333333";
const PAYER_ID = "44444444-4444-4444-8444-444444444444";
const EXPENSE_ID = "55555555-5555-4555-8555-555555555555";

describe("GET /api/expenses", () => {
  beforeEach(() => {
    getUserMock.mockReset();
    isGroupMemberMock.mockReset();
    listExpensesMock.mockReset();
  });

  // resource-authorization: "Group-Scoped Budget Resources Require
  // Membership" / "Non-member denied on transfer/savings/expense access"
  // (4b.4, Threat Matrix HTTP-routing boundary).
  it("denies a non-member of the group with 403", async () => {
    getUserMock.mockResolvedValue({ data: { user: { id: USER_ID } } });
    isGroupMemberMock.mockResolvedValue(false);

    const response = await GET(requestFor({ groupId: GROUP_ID }));

    expect(response.status).toBe(403);
    expect(await response.json()).toEqual({
      error: "Access denied to this group",
    });
    expect(listExpensesMock).not.toHaveBeenCalled();
  });

  it("returns the paginated, mapped expenses list for a member of the group", async () => {
    getUserMock.mockResolvedValue({ data: { user: { id: USER_ID } } });
    isGroupMemberMock.mockResolvedValue(true);
    listExpensesMock.mockResolvedValue({
      expenses: [
        {
          id: EXPENSE_ID,
          categoryId: CATEGORY_ID,
          payerId: PAYER_ID,
          description: "Groceries",
          amount: { toString: () => "25.5" },
          date: new Date("2026-08-01T00:00:00.000Z"),
          category: { name: "Groceries", icon: "cart" },
          payer: { user: { name: "Alice", email: "alice@example.com" } },
        },
      ],
      total: 1,
    });

    const response = await GET(
      requestFor({
        groupId: GROUP_ID,
        categoryId: CATEGORY_ID,
        memberId: PAYER_ID,
        limit: "10",
        offset: "0",
      }),
    );

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({
      expenses: [
        {
          id: EXPENSE_ID,
          categoryId: CATEGORY_ID,
          payerId: PAYER_ID,
          description: "Groceries",
          amount: 25.5,
          date: "2026-08-01T00:00:00.000Z",
          categoryName: "Groceries",
          categoryIcon: "cart",
          payerName: "Alice",
        },
      ],
      pagination: { total: 1, limit: 10, offset: 0 },
    });
    expect(isGroupMemberMock).toHaveBeenCalledWith(USER_ID, GROUP_ID);
    expect(listExpensesMock).toHaveBeenCalledWith(
      GROUP_ID,
      CATEGORY_ID,
      PAYER_ID,
      10,
      0,
      undefined,
      undefined,
    );
  });

  it("falls back to the payer's email when no name is set", async () => {
    getUserMock.mockResolvedValue({ data: { user: { id: USER_ID } } });
    isGroupMemberMock.mockResolvedValue(true);
    listExpensesMock.mockResolvedValue({
      expenses: [
        {
          id: EXPENSE_ID,
          categoryId: CATEGORY_ID,
          payerId: PAYER_ID,
          description: "Rent",
          amount: 900,
          date: new Date("2026-08-01T00:00:00.000Z"),
          category: { name: "Rent", icon: null },
          payer: { user: { name: null, email: "bob@example.com" } },
        },
      ],
      total: 1,
    });

    const response = await GET(requestFor({ groupId: GROUP_ID }));
    const body = (await response.json()) as {
      expenses: { payerName: string; categoryIcon: string }[];
    };

    expect(body.expenses[0].payerName).toBe("bob@example.com");
    expect(body.expenses[0].categoryIcon).toBe("");
    expect(listExpensesMock).toHaveBeenCalledWith(
      GROUP_ID,
      undefined,
      undefined,
      20,
      0,
      undefined,
      undefined,
    );
  });

  it("returns 401 for an unauthenticated request", async () => {
    getUserMock.mockResolvedValue({ data: { user: null } });

    const response = await GET(requestFor({ groupId: GROUP_ID }));

    expect(response.status).toBe(401);
    expect(isGroupMemberMock).not.toHaveBeenCalled();
  });

  it("returns 400 when groupId is missing", async () => {
    const response = await GET(requestFor({ groupId: null }));

    expect(response.status).toBe(400);
    expect(getUserMock).not.toHaveBeenCalled();
  });
});
