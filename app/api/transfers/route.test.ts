import { describe, it, expect, beforeEach, vi } from "vitest";
import { NextRequest } from "next/server";

// Same mocking conventions as `app/api/expenses/route.test.ts` (4b.4).
const { getUserMock, isGroupMemberMock, listTransfersMock } = vi.hoisted(
  () => ({
    getUserMock: vi.fn(),
    isGroupMemberMock: vi.fn(),
    listTransfersMock: vi.fn(),
  }),
);

vi.mock("../../../lib/supabase/server", () => ({
  createClient: vi.fn(() =>
    Promise.resolve({ auth: { getUser: getUserMock } }),
  ),
}));

vi.mock("../../../lib/server/authz", () => ({
  isGroupMember: isGroupMemberMock,
}));

vi.mock("../../../lib/server/services/transfer", () => ({
  TransferService: { listTransfers: listTransfersMock },
}));

import { GET } from "./route";

function requestFor(params: Record<string, string | null>) {
  const url = new URL("/api/transfers", "http://localhost:3000");
  for (const [key, value] of Object.entries(params)) {
    if (value !== null) url.searchParams.set(key, value);
  }
  return new NextRequest(url);
}

const USER_ID = "user-1";
const GROUP_ID = "22222222-2222-4222-8222-222222222222";
const CATEGORY_ID = "33333333-3333-4333-8333-333333333333";
const TRANSFER_ID = "44444444-4444-4444-8444-444444444444";

describe("GET /api/transfers", () => {
  beforeEach(() => {
    getUserMock.mockReset();
    isGroupMemberMock.mockReset();
    listTransfersMock.mockReset();
  });

  // resource-authorization: "Group-Scoped Budget Resources Require
  // Membership" / "Non-member denied on transfer/savings/expense access"
  // (5.6, Threat Matrix HTTP-routing boundary).
  it("denies a non-member of the group with 403", async () => {
    getUserMock.mockResolvedValue({ data: { user: { id: USER_ID } } });
    isGroupMemberMock.mockResolvedValue(false);

    const response = await GET(requestFor({ groupId: GROUP_ID }));

    expect(response.status).toBe(403);
    expect(await response.json()).toEqual({
      error: "Access denied to this group",
    });
    expect(listTransfersMock).not.toHaveBeenCalled();
  });

  it("returns the paginated, already-mapped transfers list for a member of the group", async () => {
    getUserMock.mockResolvedValue({ data: { user: { id: USER_ID } } });
    isGroupMemberMock.mockResolvedValue(true);
    listTransfersMock.mockResolvedValue({
      transfers: [
        {
          id: TRANSFER_ID,
          categoryId: CATEGORY_ID,
          categoryName: "Groceries",
          categoryIcon: "cart",
          fromMemberId: "member-a",
          fromMemberName: "Alice",
          toMemberId: "member-b",
          toMemberName: "Bob",
          amount: 30,
          date: new Date("2026-08-01T00:00:00.000Z"),
        },
      ],
      total: 1,
    });

    const response = await GET(
      requestFor({
        groupId: GROUP_ID,
        categoryId: CATEGORY_ID,
        limit: "10",
        offset: "0",
      }),
    );

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({
      transfers: [
        {
          id: TRANSFER_ID,
          categoryId: CATEGORY_ID,
          categoryName: "Groceries",
          categoryIcon: "cart",
          fromMemberId: "member-a",
          fromMemberName: "Alice",
          toMemberId: "member-b",
          toMemberName: "Bob",
          amount: 30,
          date: "2026-08-01T00:00:00.000Z",
        },
      ],
      pagination: { total: 1, limit: 10, offset: 0 },
    });
    expect(isGroupMemberMock).toHaveBeenCalledWith(USER_ID, GROUP_ID);
    expect(listTransfersMock).toHaveBeenCalledWith(
      GROUP_ID,
      CATEGORY_ID,
      undefined,
      10,
      0,
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
