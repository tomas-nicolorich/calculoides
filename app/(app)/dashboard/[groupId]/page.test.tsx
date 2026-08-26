// @vitest-environment jsdom
import { Suspense, type ReactElement } from "react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import "@testing-library/jest-dom/vitest";
import { DashboardSkeleton, CategoriesColumnSkeleton } from "./_skeletons";
import { SummaryRegion, CategoriesRegion, SavingsWarmRegion } from "./_regions";

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

  // design.md Decision 4/Data Flow: RTL's client renderer cannot render an
  // unresolved async Server Component as JSX (`SummaryRegion`/
  // `CategoriesRegion`/`SavingsWarmRegion` are all `async`), so this test
  // no longer calls `render()` — it asserts on the returned element's
  // *structure* instead: nested (not sibling) Suspense boundaries sharing
  // `_skeletons.tsx`'s exports as fallbacks, with all three service calls
  // already started. The widget-render assertions this test used to make
  // moved to `_regions.test.tsx` (Testing Strategy table, Integration row).
  it("returns nested Suspense regions with the shared skeleton fallbacks, having already started all three service calls", async () => {
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

    // The three service calls were started (not necessarily awaited) by
    // the time page.tsx returns — proves the promises are hoisted, not
    // sequentially awaited.
    expect(getGroupSummaryMock).toHaveBeenCalledWith(GROUP_ID);
    expect(listCategoriesMock).toHaveBeenCalledWith(GROUP_ID);
    expect(getGoalsForGroupMock).toHaveBeenCalledWith(GROUP_ID);

    const resultProps = result.props as { children: ReactElement[] };
    const [summarySuspense, savingsSuspense] = resultProps.children;

    // Outer boundary: SummaryRegion, falling back to the exact same
    // DashboardSkeleton `dashboard/[groupId]/loading.tsx` renders — the
    // no-visible-swap hand-off `_skeletons.tsx` exists for.
    expect(summarySuspense.type).toBe(Suspense);
    expect(
      (summarySuspense.props as { fallback: ReactElement }).fallback
        .type,
    ).toBe(DashboardSkeleton);

    const summaryRegionElement = (
      summarySuspense.props as { children: ReactElement }
    ).children;
    expect(summaryRegionElement.type).toBe(SummaryRegion);
    expect(
      (summaryRegionElement.props as { summaryPromise: unknown })
        .summaryPromise,
    ).toBeInstanceOf(Promise);

    // Nested (not sibling) boundary: CategoriesRegion lives inside
    // SummaryRegion's own `children` prop (Decision 4) so `queryKeys.summary`
    // is guaranteed hydrated before it mounts.
    const nestedCategoriesSuspense = (
      summaryRegionElement.props as { children: ReactElement }
    ).children;
    expect(nestedCategoriesSuspense.type).toBe(Suspense);
    expect(
      (nestedCategoriesSuspense.props as { fallback: ReactElement })
        .fallback.type,
    ).toBe(CategoriesColumnSkeleton);

    const categoriesRegionElement = (
      nestedCategoriesSuspense.props as { children: ReactElement }
    ).children;
    expect(categoriesRegionElement.type).toBe(CategoriesRegion);
    expect(
      (categoriesRegionElement.props as { categoriesPromise: unknown })
        .categoriesPromise,
    ).toBeInstanceOf(Promise);

    // Sibling boundary: the invisible savingsGoals warm-up region, fallback
    // `null` since no dashboard widget consumes it (Decision 3).
    expect(savingsSuspense.type).toBe(Suspense);
    expect(
      (savingsSuspense.props as { fallback: unknown }).fallback,
    ).toBeNull();

    const savingsRegionElement = (
      savingsSuspense.props as { children: ReactElement }
    ).children;
    expect(savingsRegionElement.type).toBe(SavingsWarmRegion);
    expect(
      (savingsRegionElement.props as { savingsPromise: unknown })
        .savingsPromise,
    ).toBeInstanceOf(Promise);
  });
});
