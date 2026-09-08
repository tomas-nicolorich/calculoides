import { describe, it, expect, beforeEach, vi } from "vitest";
import { NextRequest } from "next/server";

// Same mocking conventions as `app/api/expenses/route.test.ts` /
// `app/api/transfers/route.test.ts`.
const { getUserMock, isGroupMemberMock, getGoalsForGroupMock } = vi.hoisted(
  () => ({
    getUserMock: vi.fn(),
    isGroupMemberMock: vi.fn(),
    getGoalsForGroupMock: vi.fn(),
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

vi.mock("../../../lib/server/services/savings", () => ({
  SavingsService: { getGoalsForGroup: getGoalsForGroupMock },
}));

import { GET } from "./route";

function requestFor(params: Record<string, string | null>) {
  const url = new URL("/api/savings", "http://localhost:3000");
  for (const [key, value] of Object.entries(params)) {
    if (value !== null) url.searchParams.set(key, value);
  }
  return new NextRequest(url);
}

const USER_ID = "user-1";
const GROUP_ID = "22222222-2222-4222-8222-222222222222";
const GOAL_ID = "33333333-3333-4333-8333-333333333333";

describe("GET /api/savings", () => {
  beforeEach(() => {
    getUserMock.mockReset();
    isGroupMemberMock.mockReset();
    getGoalsForGroupMock.mockReset();
  });

  // resource-authorization: "Group-Scoped Budget Resources Require
  // Membership" / "Non-member denied on transfer/savings/expense access"
  // (6b.2, Threat Matrix HTTP-routing boundary).
  it("denies a non-member of the group with 403", async () => {
    getUserMock.mockResolvedValue({ data: { user: { id: USER_ID } } });
    isGroupMemberMock.mockResolvedValue(false);

    const response = await GET(requestFor({ groupId: GROUP_ID }));

    expect(response.status).toBe(403);
    expect(await response.json()).toEqual({
      error: "Access denied to this group",
    });
    expect(getGoalsForGroupMock).not.toHaveBeenCalled();
  });

  it("returns the goals list (with breakdown/projections) for a member of the group", async () => {
    getUserMock.mockResolvedValue({ data: { user: { id: USER_ID } } });
    isGroupMemberMock.mockResolvedValue(true);
    const goals = [
      {
        id: GOAL_ID,
        groupId: GROUP_ID,
        name: "Car",
        targetAmount: 1200,
        currentAmount: 200,
        projectedDate: new Date("2027-01-01T00:00:00.000Z"),
        varianceMonths: 0,
        isNever: false,
        breakdown: [],
      },
    ];
    getGoalsForGroupMock.mockResolvedValue(goals);

    const response = await GET(requestFor({ groupId: GROUP_ID }));

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual(
      JSON.parse(JSON.stringify(goals)) as unknown,
    );
    expect(isGroupMemberMock).toHaveBeenCalledWith(USER_ID, GROUP_ID);
    expect(getGoalsForGroupMock).toHaveBeenCalledWith(GROUP_ID);
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
