import { describe, it, expect, vi, beforeEach } from "vitest";
import type { ReactElement } from "react";
import type { DehydratedState } from "@tanstack/react-query";
import { queryKeys } from "../../../../lib/query-keys";

const { getUserMock, notFoundMock, isGroupMemberMock, listExpensesMock } =
  vi.hoisted(() => ({
    getUserMock: vi.fn(),
    notFoundMock: vi.fn(() => {
      throw new Error("NEXT_NOT_FOUND");
    }),
    isGroupMemberMock: vi.fn(),
    listExpensesMock: vi.fn(),
  }));

vi.mock("../../../../lib/supabase/server", () => ({
  createClient: vi.fn(() =>
    Promise.resolve({ auth: { getUser: getUserMock } }),
  ),
}));

vi.mock("next/navigation", () => ({
  notFound: notFoundMock,
}));

vi.mock("../../../../lib/server/authz", () => ({
  isGroupMember: isGroupMemberMock,
}));

vi.mock("../../../../lib/server/services/expense", () => ({
  ExpenseService: { listExpenses: listExpensesMock },
}));

import ExpensesPage from "./page";
import { ExpensesClient } from "./ExpensesClient";

const USER_ID = "user-1";
const GROUP_ID = "22222222-2222-4222-8222-222222222222";
const CATEGORY_ID = "33333333-3333-4333-8333-333333333333";
const PAYER_ID = "44444444-4444-4444-8444-444444444444";
const EXPENSE_ID = "55555555-5555-4555-8555-555555555555";

describe("app/(app)/expenses/[groupId]/page", () => {
  beforeEach(() => {
    getUserMock.mockReset();
    notFoundMock.mockClear();
    isGroupMemberMock.mockReset();
    listExpensesMock.mockReset();
  });

  it("calls notFound for an unauthenticated caller", async () => {
    getUserMock.mockResolvedValue({ data: { user: null } });

    await expect(
      ExpensesPage({ params: Promise.resolve({ groupId: GROUP_ID }) }),
    ).rejects.toThrow("NEXT_NOT_FOUND");

    expect(isGroupMemberMock).not.toHaveBeenCalled();
  });

  // resource-authorization: "Group-Scoped Budget Resources Require
  // Membership" — the Server Component itself must deny a non-member
  // before rendering, same precedent as
  // `app/(app)/dashboard/[groupId]/page.tsx`.
  it("calls notFound for a non-member of the group", async () => {
    getUserMock.mockResolvedValue({ data: { user: { id: USER_ID } } });
    isGroupMemberMock.mockResolvedValue(false);

    await expect(
      ExpensesPage({ params: Promise.resolve({ groupId: GROUP_ID }) }),
    ).rejects.toThrow("NEXT_NOT_FOUND");

    expect(listExpensesMock).not.toHaveBeenCalled();
  });

  // double-skeleton fix: prefetching the exact key `useExpensesList`'s
  // default (no-filter) call reads, then hydrating it into a
  // `HydrationBoundary`, is what makes `ExpensesClient`'s own `isLoading`
  // skeleton a no-op on first paint — genuinely RED against the prior
  // client-only-fetch `page.tsx` (no `listExpensesMock` call, no
  // `HydrationBoundary` in the returned element).
  it("prefetches the default expenses list and hydrates it for the client", async () => {
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

    const result = (await ExpensesPage({
      params: Promise.resolve({ groupId: GROUP_ID }),
    })) as ReactElement;

    expect(isGroupMemberMock).toHaveBeenCalledWith(USER_ID, GROUP_ID);
    expect(listExpensesMock).toHaveBeenCalledWith(
      GROUP_ID,
      undefined,
      undefined,
      25,
      0,
    );

    const state = (result.props as { state: DehydratedState }).state;
    const key = queryKeys.expenses(GROUP_ID, { limit: 25, offset: 0 });
    const query = state.queries.find(
      (q) => JSON.stringify(q.queryKey) === JSON.stringify(key),
    );
    expect(query?.state.data).toEqual({
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
      pagination: { total: 1, limit: 25, offset: 0 },
    });

    const clientElement = (result.props as { children: ReactElement })
      .children;
    expect(clientElement.type).toBe(ExpensesClient);
    expect(clientElement.props).toMatchObject({
      groupId: GROUP_ID,
      currentUserId: USER_ID,
    });
  });
});
