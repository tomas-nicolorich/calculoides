import { describe, it, expect, beforeEach, vi } from "vitest";
import { NextRequest } from "next/server";

const { getUserMock, getTransfersForCategoryMock } = vi.hoisted(() => ({
  getUserMock: vi.fn(),
  getTransfersForCategoryMock: vi.fn(),
}));

vi.mock("../../../../lib/supabase/server", () => ({
  createClient: vi.fn(() =>
    Promise.resolve({ auth: { getUser: getUserMock } }),
  ),
}));

vi.mock("../../../../lib/server/services/transfer", () => ({
  TransferService: { getTransfersForCategory: getTransfersForCategoryMock },
}));

import { GET } from "./route";

function requestFor(params: Record<string, string | null>) {
  const url = new URL("/api/transfers/by-category", "http://localhost:3000");
  for (const [key, value] of Object.entries(params)) {
    if (value !== null) url.searchParams.set(key, value);
  }
  return new NextRequest(url);
}

const USER_ID = "user-1";
const CATEGORY_ID = "33333333-3333-4333-8333-333333333333";

describe("GET /api/transfers/by-category", () => {
  beforeEach(() => {
    getUserMock.mockReset();
    getTransfersForCategoryMock.mockReset();
  });

  // resource-authorization: "Group-Scoped Budget Resources Require
  // Membership" / "Non-member denied on transfer/savings/expense access"
  // (5.6, Threat Matrix HTTP-routing boundary). `TransferService
  // .getTransfersForCategory` resolves the group from the category's own
  // record and throws "Not a member of this group" internally — the route
  // surfaces that as 403 via `toStatus`, same non-duplication precedent
  // `expense.ts`'s `update` established (4a.4).
  it("denies a non-member of the category's group with 403", async () => {
    getUserMock.mockResolvedValue({ data: { user: { id: USER_ID } } });
    getTransfersForCategoryMock.mockRejectedValue(
      new Error("Not a member of this group"),
    );

    const response = await GET(requestFor({ categoryId: CATEGORY_ID }));

    expect(response.status).toBe(403);
    expect(await response.json()).toEqual({
      error: "Not a member of this group",
    });
  });

  it("returns 404 when the category does not exist", async () => {
    getUserMock.mockResolvedValue({ data: { user: { id: USER_ID } } });
    getTransfersForCategoryMock.mockRejectedValue(
      new Error("Category not found"),
    );

    const response = await GET(requestFor({ categoryId: CATEGORY_ID }));

    expect(response.status).toBe(404);
    expect(await response.json()).toEqual({ error: "Category not found" });
  });

  it("returns the transfers for a member of the category's group", async () => {
    getUserMock.mockResolvedValue({ data: { user: { id: USER_ID } } });
    getTransfersForCategoryMock.mockResolvedValue([
      { id: "transfer-1", amount: 20 },
    ]);

    const response = await GET(requestFor({ categoryId: CATEGORY_ID }));

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual([{ id: "transfer-1", amount: 20 }]);
    expect(getTransfersForCategoryMock).toHaveBeenCalledWith(
      CATEGORY_ID,
      USER_ID,
    );
  });

  it("returns 401 for an unauthenticated request", async () => {
    getUserMock.mockResolvedValue({ data: { user: null } });

    const response = await GET(requestFor({ categoryId: CATEGORY_ID }));

    expect(response.status).toBe(401);
    expect(getTransfersForCategoryMock).not.toHaveBeenCalled();
  });

  it("returns 400 when categoryId is missing", async () => {
    const response = await GET(requestFor({ categoryId: null }));

    expect(response.status).toBe(400);
    expect(getUserMock).not.toHaveBeenCalled();
  });
});
