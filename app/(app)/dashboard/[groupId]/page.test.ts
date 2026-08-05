import { describe, it, expect, vi, beforeEach } from "vitest";

// `vi.hoisted` — see `app/(app)/layout.test.tsx` for the same TDZ rationale.
const {
  getUserMock,
  notFoundMock,
  isGroupMemberMock,
  getGroupSummaryMock,
  listCategoriesMock,
} = vi.hoisted(() => ({
  getUserMock: vi.fn(),
  notFoundMock: vi.fn(() => {
    throw new Error("NEXT_NOT_FOUND");
  }),
  isGroupMemberMock: vi.fn(),
  getGroupSummaryMock: vi.fn(),
  listCategoriesMock: vi.fn(),
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

vi.mock("../../../../lib/server/services/summary", () => ({
  SummaryService: { getGroupSummary: getGroupSummaryMock },
}));

vi.mock("../../../../lib/server/services/budget", () => ({
  BudgetService: { listCategoriesWithBalances: listCategoriesMock },
}));

import DashboardPage from "./page";

const USER_ID = "user-1";
const GROUP_ID = "22222222-2222-4222-8222-222222222222";

describe("app/(app)/dashboard/[groupId]/page", () => {
  beforeEach(() => {
    getUserMock.mockReset();
    notFoundMock.mockClear();
    isGroupMemberMock.mockReset();
    getGroupSummaryMock.mockReset();
    listCategoriesMock.mockReset();
  });

  // resource-authorization: "Group-Scoped Budget Resources Require
  // Membership" — the Server Component itself, not only the Route
  // Handlers, must deny a non-member before touching group data (2.1;
  // `lib/server/services/summary.ts`'s doc comment: callers MUST verify
  // membership since the service performs no authz check itself).
  it("calls notFound for a non-member of the group", async () => {
    getUserMock.mockResolvedValue({ data: { user: { id: USER_ID } } });
    isGroupMemberMock.mockResolvedValue(false);

    await expect(
      DashboardPage({ params: Promise.resolve({ groupId: GROUP_ID }) }),
    ).rejects.toThrow("NEXT_NOT_FOUND");

    expect(getGroupSummaryMock).not.toHaveBeenCalled();
    expect(listCategoriesMock).not.toHaveBeenCalled();
  });

  it("prefetches summary and categories for a member of the group", async () => {
    getUserMock.mockResolvedValue({ data: { user: { id: USER_ID } } });
    isGroupMemberMock.mockResolvedValue(true);
    getGroupSummaryMock.mockResolvedValue({ groupName: "Roomies" });
    listCategoriesMock.mockResolvedValue([]);

    const result = await DashboardPage({
      params: Promise.resolve({ groupId: GROUP_ID }),
    });

    expect(result).toBeTruthy();
    expect(isGroupMemberMock).toHaveBeenCalledWith(USER_ID, GROUP_ID);
    expect(getGroupSummaryMock).toHaveBeenCalledWith(GROUP_ID);
    expect(listCategoriesMock).toHaveBeenCalledWith(GROUP_ID);
  });
});
