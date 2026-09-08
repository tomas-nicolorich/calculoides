import { describe, it, expect, vi, beforeEach } from "vitest";
import type { ReactElement } from "react";
import type { DehydratedState } from "@tanstack/react-query";
import { queryKeys } from "../../../../lib/query-keys";

const {
  getUserMock,
  notFoundMock,
  isGroupMemberMock,
  requireGroupMemberMock,
  getGoalsForGroupMock,
} = vi.hoisted(() => {
  const getUserMock = vi.fn();
  const notFoundMock = vi.fn(() => {
    throw new Error("NEXT_NOT_FOUND");
  });
  const isGroupMemberMock = vi.fn();
  const requireGroupMemberMock = vi.fn(async (groupId: string) => {
    const {
      data: { user },
    } = (await getUserMock()) as { data: { user: { id: string } | null } };
    if (!user) {
      notFoundMock();
      throw new Error("NEXT_NOT_FOUND");
    }
    const isMember = (await isGroupMemberMock(user.id, groupId)) as boolean;
    if (!isMember) {
      notFoundMock();
      throw new Error("NEXT_NOT_FOUND");
    }
    return { userId: user.id };
  });
  return {
    getUserMock,
    notFoundMock,
    isGroupMemberMock,
    requireGroupMemberMock,
    getGoalsForGroupMock: vi.fn(),
  };
});

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
  requireGroupMember: requireGroupMemberMock,
}));

vi.mock("../../../../lib/server/services/savings", () => ({
  SavingsService: { getGoalsForGroup: getGoalsForGroupMock },
}));

import SavingsPage from "./page";
import { SavingsClient } from "./SavingsClient";

const USER_ID = "user-1";
const GROUP_ID = "22222222-2222-4222-8222-222222222222";

describe("app/(app)/savings/[groupId]/page", () => {
  beforeEach(() => {
    getUserMock.mockReset();
    notFoundMock.mockClear();
    isGroupMemberMock.mockReset();
    requireGroupMemberMock.mockClear();
    getGoalsForGroupMock.mockReset();
  });

  it("calls notFound for an unauthenticated caller", async () => {
    getUserMock.mockResolvedValue({ data: { user: null } });

    await expect(
      SavingsPage({ params: Promise.resolve({ groupId: GROUP_ID }) }),
    ).rejects.toThrow("NEXT_NOT_FOUND");

    expect(isGroupMemberMock).not.toHaveBeenCalled();
  });

  // resource-authorization: "Group-Scoped Budget Resources Require
  // Membership" — the Server Component itself must deny a non-member
  // before rendering, same precedent as
  // `app/(app)/expenses/[groupId]/page.tsx` (4b.6) /
  // `app/(app)/transfers/[groupId]/page.tsx` (5.8).
  it("calls notFound for a non-member of the group", async () => {
    getUserMock.mockResolvedValue({ data: { user: { id: USER_ID } } });
    isGroupMemberMock.mockResolvedValue(false);

    await expect(
      SavingsPage({ params: Promise.resolve({ groupId: GROUP_ID }) }),
    ).rejects.toThrow("NEXT_NOT_FOUND");

    expect(getGoalsForGroupMock).not.toHaveBeenCalled();
  });

  // double-skeleton fix: prefetching `queryKeys.savingsGoals(groupId)` — the
  // exact key `useSavingsGoalsList` reads — then hydrating it into a
  // `HydrationBoundary`, is what makes `SavingsClient`'s own `isLoading`
  // skeleton a no-op on first paint — genuinely RED against the prior
  // client-only-fetch `page.tsx` (no `getGoalsForGroupMock` call, no
  // `HydrationBoundary` in the returned element).
  it("prefetches the savings goals list and hydrates it for the client", async () => {
    getUserMock.mockResolvedValue({ data: { user: { id: USER_ID } } });
    isGroupMemberMock.mockResolvedValue(true);
    const goalsFixture = [
      {
        id: "goal-1",
        groupId: GROUP_ID,
        name: "Vacation",
        icon: null,
        targetAmount: 1000,
        currentAmount: 200,
        targetDate: new Date("2026-12-01T00:00:00.000Z"),
        projectedDate: new Date("2026-11-01T00:00:00.000Z"),
        varianceMonths: 0,
        isNever: false,
        breakdown: [],
      },
    ];
    getGoalsForGroupMock.mockResolvedValue(goalsFixture);

    const result = (await SavingsPage({
      params: Promise.resolve({ groupId: GROUP_ID }),
    })) as ReactElement;

    expect(isGroupMemberMock).toHaveBeenCalledWith(USER_ID, GROUP_ID);
    expect(getGoalsForGroupMock).toHaveBeenCalledWith(GROUP_ID);

    const state = (result.props as { state: DehydratedState }).state;
    const key = queryKeys.savingsGoals(GROUP_ID);
    const query = state.queries.find(
      (q) => JSON.stringify(q.queryKey) === JSON.stringify(key),
    );
    expect(query?.state.data).toEqual(goalsFixture);

    const clientElement = (result.props as { children: ReactElement })
      .children;
    expect(clientElement.type).toBe(SavingsClient);
    expect(clientElement.props).toMatchObject({ groupId: GROUP_ID });
  });
});
