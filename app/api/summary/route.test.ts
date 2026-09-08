import { describe, it, expect, beforeEach, vi } from "vitest";
import { NextRequest } from "next/server";

// Same mocking conventions as `app/api/[...legacy]/route.test.ts`.
const { getUserMock, isGroupMemberMock, getGroupSummaryMock } = vi.hoisted(
  () => ({
    getUserMock: vi.fn(),
    isGroupMemberMock: vi.fn(),
    getGroupSummaryMock: vi.fn(),
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

vi.mock("../../../lib/server/services/summary", () => ({
  SummaryService: { getGroupSummary: getGroupSummaryMock },
}));

import { GET } from "./route";

function requestFor(groupId: string | null) {
  const url = new URL("/api/summary", "http://localhost:3000");
  if (groupId !== null) url.searchParams.set("groupId", groupId);
  return new NextRequest(url);
}

const USER_ID = "user-1";
const GROUP_ID = "22222222-2222-4222-8222-222222222222";

describe("GET /api/summary", () => {
  beforeEach(() => {
    getUserMock.mockReset();
    isGroupMemberMock.mockReset();
    getGroupSummaryMock.mockReset();
  });

  // resource-authorization: "Group-Scoped Budget Resources Require
  // Membership" / "Non-member denied on transfer/savings/expense access"
  // (2.7, Threat Matrix HTTP-routing boundary).
  it("denies a non-member of the group with 403", async () => {
    getUserMock.mockResolvedValue({ data: { user: { id: USER_ID } } });
    isGroupMemberMock.mockResolvedValue(false);

    const response = await GET(requestFor(GROUP_ID));

    expect(response.status).toBe(403);
    expect(await response.json()).toEqual({
      error: "Access denied to this group",
    });
    expect(getGroupSummaryMock).not.toHaveBeenCalled();
  });

  it("returns the summary for a member of the group", async () => {
    getUserMock.mockResolvedValue({ data: { user: { id: USER_ID } } });
    isGroupMemberMock.mockResolvedValue(true);
    getGroupSummaryMock.mockResolvedValue({ groupName: "Roomies" });

    const response = await GET(requestFor(GROUP_ID));

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ groupName: "Roomies" });
    expect(isGroupMemberMock).toHaveBeenCalledWith(USER_ID, GROUP_ID);
  });

  it("returns 401 for an unauthenticated request", async () => {
    getUserMock.mockResolvedValue({ data: { user: null } });

    const response = await GET(requestFor(GROUP_ID));

    expect(response.status).toBe(401);
    expect(isGroupMemberMock).not.toHaveBeenCalled();
  });

  it("returns 400 when groupId is missing", async () => {
    const response = await GET(requestFor(null));

    expect(response.status).toBe(400);
    expect(getUserMock).not.toHaveBeenCalled();
  });
});
