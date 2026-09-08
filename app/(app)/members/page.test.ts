import { describe, it, expect, vi, beforeEach } from "vitest";

const {
  getUserMock,
  notFoundMock,
  isGroupMemberMock,
  isGroupOwnerMock,
  getGroupMembersMock,
  getGroupsForUserMock,
  getUserServiceMock,
} = vi.hoisted(() => ({
  getUserMock: vi.fn(),
  notFoundMock: vi.fn(() => {
    throw new Error("NEXT_NOT_FOUND");
  }),
  isGroupMemberMock: vi.fn(),
  isGroupOwnerMock: vi.fn(),
  getGroupMembersMock: vi.fn(),
  getGroupsForUserMock: vi.fn(),
  getUserServiceMock: vi.fn(),
}));

vi.mock("../../../lib/supabase/server", () => ({
  createClient: vi.fn(() =>
    Promise.resolve({ auth: { getUser: getUserMock } }),
  ),
}));

vi.mock("next/navigation", () => ({
  notFound: notFoundMock,
}));

vi.mock("../../../lib/server/authz", () => ({
  isGroupMember: isGroupMemberMock,
  isGroupOwner: isGroupOwnerMock,
}));

vi.mock("../../../lib/server/services/group", () => ({
  GroupService: {
    getGroupMembers: getGroupMembersMock,
    getGroupsForUser: getGroupsForUserMock,
  },
}));

vi.mock("../../../lib/server/services/user", () => ({
  UserService: { getUser: getUserServiceMock },
}));

import MembersPage from "./page";

const USER_ID = "user-1";
const GROUP_ID = "22222222-2222-4222-8222-222222222222";

describe("app/(app)/members/page", () => {
  beforeEach(() => {
    getUserMock.mockReset();
    notFoundMock.mockClear();
    isGroupMemberMock.mockReset();
    isGroupOwnerMock.mockReset();
    getGroupMembersMock.mockReset();
    getGroupsForUserMock.mockReset();
    getUserServiceMock.mockReset();
  });

  // resource-authorization: "Non-member denied" scenario.
  it("calls notFound for a non-member of the requested group", async () => {
    getUserMock.mockResolvedValue({ data: { user: { id: USER_ID } } });
    isGroupMemberMock.mockResolvedValue(false);

    await expect(
      MembersPage({
        searchParams: Promise.resolve({ groupId: GROUP_ID }),
      }),
    ).rejects.toThrow("NEXT_NOT_FOUND");

    expect(getGroupMembersMock).not.toHaveBeenCalled();
  });

  // 3b.7 second clause: "users me" is resolved only from the session id.
  it("fetches members and the caller's own profile via the session id, for a member of the group", async () => {
    getUserMock.mockResolvedValue({ data: { user: { id: USER_ID } } });
    isGroupMemberMock.mockResolvedValue(true);
    isGroupOwnerMock.mockResolvedValue(true);
    getGroupMembersMock.mockResolvedValue([
      { id: "member-1", userId: USER_ID, income: 1000 },
    ]);
    getUserServiceMock.mockResolvedValue({ id: USER_ID, name: "Jane" });

    const result = await MembersPage({
      searchParams: Promise.resolve({ groupId: GROUP_ID }),
    });

    expect(result).toBeTruthy();
    expect(getGroupMembersMock).toHaveBeenCalledWith(GROUP_ID);
    expect(getUserServiceMock).toHaveBeenCalledWith(USER_ID);
  });

  it("renders a group picker when no groupId is given, without reading membership", async () => {
    getUserMock.mockResolvedValue({ data: { user: { id: USER_ID } } });
    getGroupsForUserMock.mockResolvedValue([{ id: GROUP_ID, name: "Roomies" }]);

    const result = await MembersPage({ searchParams: Promise.resolve({}) });

    expect(result).toBeTruthy();
    expect(isGroupMemberMock).not.toHaveBeenCalled();
    expect(getGroupsForUserMock).toHaveBeenCalledWith(USER_ID);
  });
});
