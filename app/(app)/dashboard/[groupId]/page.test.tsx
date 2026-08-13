// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach } from "vitest";
import { cleanup, render, screen } from "@testing-library/react";
import "@testing-library/jest-dom/vitest";
import { QueryClientProvider } from "@tanstack/react-query";
import { createQueryClient } from "../../../../lib/query-client";

// `vi.hoisted` — see `app/(app)/layout.test.tsx` for the same TDZ rationale.
const {
  getUserMock,
  notFoundMock,
  isGroupMemberMock,
  getGroupSummaryMock,
  listCategoriesMock,
  getGoalsForGroupMock,
} = vi.hoisted(() => ({
  getUserMock: vi.fn(),
  notFoundMock: vi.fn(() => {
    throw new Error("NEXT_NOT_FOUND");
  }),
  isGroupMemberMock: vi.fn(),
  getGroupSummaryMock: vi.fn(),
  listCategoriesMock: vi.fn(),
  getGoalsForGroupMock: vi.fn(),
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

vi.mock("../../../../lib/server/services/savings", () => ({
  SavingsService: { getGoalsForGroup: getGoalsForGroupMock },
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
    getGoalsForGroupMock.mockReset();
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
    getGoalsForGroupMock.mockResolvedValue([]);

    const result = await DashboardPage({
      params: Promise.resolve({ groupId: GROUP_ID }),
    });

    expect(result).toBeTruthy();
    expect(isGroupMemberMock).toHaveBeenCalledWith(USER_ID, GROUP_ID);
    expect(getGroupSummaryMock).toHaveBeenCalledWith(GROUP_ID);
    expect(listCategoriesMock).toHaveBeenCalledWith(GROUP_ID);
  });

  // dashboard-view: "One Server Prefetch Feeds the Summary-Dependent
  // Widgets" — extended to the third widget group, `savingsGoals` (16.1).
  it("prefetches savingsGoals alongside summary and categories", async () => {
    getUserMock.mockResolvedValue({ data: { user: { id: USER_ID } } });
    isGroupMemberMock.mockResolvedValue(true);
    getGroupSummaryMock.mockResolvedValue({ groupName: "Roomies" });
    listCategoriesMock.mockResolvedValue([]);
    getGoalsForGroupMock.mockResolvedValue([]);

    await DashboardPage({
      params: Promise.resolve({ groupId: GROUP_ID }),
    });

    expect(getGoalsForGroupMock).toHaveBeenCalledWith(GROUP_ID);
  });

  // dashboard-view: "No client-side waterfall for summary-backed widgets" —
  // the full pipeline (Server Component prefetch → dehydrate →
  // HydrationBoundary → DashboardClient's widget tree) must render from the
  // server-fetched data alone; no summary-consuming widget may issue its
  // own initial client fetch. Extends the `DashboardClient.test.tsx`
  // `prefetchServerClient()` pattern to the real Server Component output
  // per the Testing Strategy table's Integration row.
  it("renders the widget tree from the server prefetch with no client-side fetch", async () => {
    getUserMock.mockResolvedValue({ data: { user: { id: USER_ID } } });
    isGroupMemberMock.mockResolvedValue(true);
    getGroupSummaryMock.mockResolvedValue({
      groupName: "Roomies",
      ownerId: USER_ID,
      totalIncome: 4000,
      totalBudget: 400,
      totalSpent: 120,
      members: [],
      recentExpenses: [],
      recentTransfers: [],
    });
    listCategoriesMock.mockResolvedValue([]);
    getGoalsForGroupMock.mockResolvedValue([]);

    const result = await DashboardPage({
      params: Promise.resolve({ groupId: GROUP_ID }),
    });

    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);
    // `BudgetCategories`' create/edit/delete dialogs (PR 15) always mount
    // `ResponsiveDialog`, which calls `useIsMobile()` even while closed —
    // mirrors `ResponsiveDialog.test.tsx`'s own stub.
    vi.stubGlobal(
      "matchMedia",
      vi.fn().mockImplementation((query: string) => ({
        matches: false,
        media: query,
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
      })),
    );

    render(
      <QueryClientProvider client={createQueryClient()}>
        {result}
      </QueryClientProvider>,
    );

    expect(await screen.findByText("Roomies")).toBeInTheDocument();
    expect(await screen.findByText("Remaining Balance")).toBeInTheDocument();
    expect(await screen.findByText("Recent Expenses")).toBeInTheDocument();
    expect(fetchMock).not.toHaveBeenCalled();

    cleanup();
    vi.unstubAllGlobals();
  });
});
