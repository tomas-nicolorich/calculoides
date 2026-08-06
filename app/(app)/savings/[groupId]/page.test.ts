import { describe, it, expect, vi, beforeEach } from "vitest";

const { getUserMock, notFoundMock, isGroupMemberMock } = vi.hoisted(() => ({
  getUserMock: vi.fn(),
  notFoundMock: vi.fn(() => {
    throw new Error("NEXT_NOT_FOUND");
  }),
  isGroupMemberMock: vi.fn(),
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

import SavingsPage from "./page";

const USER_ID = "user-1";
const GROUP_ID = "22222222-2222-4222-8222-222222222222";

describe("app/(app)/savings/[groupId]/page", () => {
  beforeEach(() => {
    getUserMock.mockReset();
    notFoundMock.mockClear();
    isGroupMemberMock.mockReset();
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
  });

  it("renders for a member of the group", async () => {
    getUserMock.mockResolvedValue({ data: { user: { id: USER_ID } } });
    isGroupMemberMock.mockResolvedValue(true);

    const result = await SavingsPage({
      params: Promise.resolve({ groupId: GROUP_ID }),
    });

    expect(result).toBeTruthy();
    expect(isGroupMemberMock).toHaveBeenCalledWith(USER_ID, GROUP_ID);
  });
});
