import { describe, it, expect, vi, beforeEach } from "vitest";
import type { ReactElement } from "react";
import type { DehydratedState } from "@tanstack/react-query";
import { queryKeys } from "../../../../lib/query-keys";

const {
  getUserMock,
  notFoundMock,
  isGroupMemberMock,
  requireGroupMemberMock,
  listTransfersMock,
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
    listTransfersMock: vi.fn(),
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

vi.mock("../../../../lib/server/services/transfer", () => ({
  TransferService: { listTransfers: listTransfersMock },
}));

import TransfersPage from "./page";
import { TransfersClient } from "./TransfersClient";

const USER_ID = "user-1";
const GROUP_ID = "22222222-2222-4222-8222-222222222222";

describe("app/(app)/transfers/[groupId]/page", () => {
  beforeEach(() => {
    getUserMock.mockReset();
    notFoundMock.mockClear();
    isGroupMemberMock.mockReset();
    requireGroupMemberMock.mockClear();
    listTransfersMock.mockReset();
  });

  it("calls notFound for an unauthenticated caller", async () => {
    getUserMock.mockResolvedValue({ data: { user: null } });

    await expect(
      TransfersPage({ params: Promise.resolve({ groupId: GROUP_ID }) }),
    ).rejects.toThrow("NEXT_NOT_FOUND");

    expect(isGroupMemberMock).not.toHaveBeenCalled();
  });

  // resource-authorization: "Group-Scoped Budget Resources Require
  // Membership" — the Server Component itself must deny a non-member before
  // rendering, same precedent as `app/(app)/expenses/[groupId]/page.tsx`.
  it("calls notFound for a non-member of the group", async () => {
    getUserMock.mockResolvedValue({ data: { user: { id: USER_ID } } });
    isGroupMemberMock.mockResolvedValue(false);

    await expect(
      TransfersPage({ params: Promise.resolve({ groupId: GROUP_ID }) }),
    ).rejects.toThrow("NEXT_NOT_FOUND");

    expect(listTransfersMock).not.toHaveBeenCalled();
  });

  // double-skeleton fix: prefetching the exact key `useTransfersList`'s
  // default (no-filter) call reads, then hydrating it into a
  // `HydrationBoundary`, is what makes `TransfersClient`'s own `isLoading`
  // skeleton a no-op on first paint — genuinely RED against the prior
  // client-only-fetch `page.tsx` (no `listTransfersMock` call, no
  // `HydrationBoundary` in the returned element).
  it("prefetches the default transfers list and hydrates it for the client", async () => {
    getUserMock.mockResolvedValue({ data: { user: { id: USER_ID } } });
    isGroupMemberMock.mockResolvedValue(true);
    const transfersFixture = [
      {
        id: "transfer-1",
        categoryId: "category-1",
        categoryName: "Rent",
        categoryIcon: "home",
        fromMemberId: "member-1",
        fromMemberName: "Alice",
        toMemberId: "member-2",
        toMemberName: "Bob",
        amount: 50,
        date: new Date("2026-08-01T00:00:00.000Z"),
      },
    ];
    listTransfersMock.mockResolvedValue({
      transfers: transfersFixture,
      total: 1,
    });

    const result = (await TransfersPage({
      params: Promise.resolve({ groupId: GROUP_ID }),
    })) as ReactElement;

    expect(isGroupMemberMock).toHaveBeenCalledWith(USER_ID, GROUP_ID);
    expect(listTransfersMock).toHaveBeenCalledWith(
      GROUP_ID,
      undefined,
      undefined,
      25,
      0,
    );

    const state = (result.props as { state: DehydratedState }).state;
    const key = queryKeys.transfers(GROUP_ID, { limit: 25, offset: 0 });
    const query = state.queries.find(
      (q) => JSON.stringify(q.queryKey) === JSON.stringify(key),
    );
    expect(query?.state.data).toEqual({
      transfers: transfersFixture,
      pagination: { total: 1, limit: 25, offset: 0 },
    });

    const clientElement = (result.props as { children: ReactElement })
      .children;
    expect(clientElement.type).toBe(TransfersClient);
    expect(clientElement.props).toMatchObject({ groupId: GROUP_ID });
  });
});
