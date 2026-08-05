import { describe, it, expect, vi, beforeEach } from "vitest";

const { getUserMock, notFoundMock, getGroupsForUserMock } = vi.hoisted(() => ({
  getUserMock: vi.fn(),
  notFoundMock: vi.fn(() => {
    throw new Error("NEXT_NOT_FOUND");
  }),
  getGroupsForUserMock: vi.fn(),
}));

vi.mock("../../../lib/supabase/server", () => ({
  createClient: vi.fn(() =>
    Promise.resolve({ auth: { getUser: getUserMock } }),
  ),
}));

vi.mock("next/navigation", () => ({
  notFound: notFoundMock,
}));

vi.mock("../../../lib/server/services/group", () => ({
  GroupService: { getGroupsForUser: getGroupsForUserMock },
}));

import GroupsPage from "./page";

const USER_ID = "user-1";

describe("app/(app)/groups/page", () => {
  beforeEach(() => {
    getUserMock.mockReset();
    notFoundMock.mockClear();
    getGroupsForUserMock.mockReset();
  });

  it("calls notFound for an unauthenticated caller and never reads groups", async () => {
    getUserMock.mockResolvedValue({ data: { user: null } });

    await expect(GroupsPage()).rejects.toThrow("NEXT_NOT_FOUND");

    expect(getGroupsForUserMock).not.toHaveBeenCalled();
  });

  it("fetches the signed-in user's own groups, never another user's", async () => {
    getUserMock.mockResolvedValue({ data: { user: { id: USER_ID } } });
    getGroupsForUserMock.mockResolvedValue([
      { id: "group-1", name: "Roomies", role: "OWNER", members: [] },
    ]);

    const result = await GroupsPage();

    expect(result).toBeTruthy();
    expect(getGroupsForUserMock).toHaveBeenCalledWith(USER_ID);
  });
});
