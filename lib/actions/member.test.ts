import { describe, it, expect, vi, beforeEach } from "vitest";

// Same mocking conventions as `lib/actions/group.test.ts`.
const {
  getUserMock,
  isGroupOwnerMock,
  updateMemberIncomeMock,
  getMemberByIdMock,
  removeMemberMock,
} = vi.hoisted(() => ({
  getUserMock: vi.fn(),
  isGroupOwnerMock: vi.fn(),
  updateMemberIncomeMock: vi.fn(),
  getMemberByIdMock: vi.fn(),
  removeMemberMock: vi.fn(),
}));

vi.mock("../supabase/server", () => ({
  createClient: vi.fn(() =>
    Promise.resolve({ auth: { getUser: getUserMock } }),
  ),
}));

vi.mock("../server/authz", () => ({
  isGroupOwner: isGroupOwnerMock,
}));

vi.mock("../server/services/group", () => ({
  GroupService: {
    updateMemberIncome: updateMemberIncomeMock,
    getMemberById: getMemberByIdMock,
    removeMember: removeMemberMock,
  },
}));

import { updateIncome, removeMember } from "./member";

const USER_ID = "11111111-1111-4111-8111-111111111111";
const GROUP_ID = "22222222-2222-4222-8222-222222222222";
const OTHER_GROUP_ID = "33333333-3333-4333-8333-333333333333";
const MEMBER_ID = "44444444-4444-4444-8444-444444444444";

// resource-authorization: "Member Income Update Requires Membership" (3b.1).
describe("updateIncome", () => {
  beforeEach(() => {
    getUserMock.mockReset();
    updateMemberIncomeMock.mockReset();
  });

  it("succeeds when a fellow member updates another member's income", async () => {
    getUserMock.mockResolvedValue({ data: { user: { id: USER_ID } } });
    updateMemberIncomeMock.mockResolvedValue({ id: MEMBER_ID, income: 3000 });

    const result = await updateIncome({ memberId: MEMBER_ID, income: 3000 });

    expect(result).toEqual({
      ok: true,
      data: { id: MEMBER_ID, income: 3000 },
    });
    expect(updateMemberIncomeMock).toHaveBeenCalledWith(
      USER_ID,
      MEMBER_ID,
      3000,
    );
  });

  it("denies an outsider with 403 via the service's membership check", async () => {
    getUserMock.mockResolvedValue({ data: { user: { id: USER_ID } } });
    updateMemberIncomeMock.mockRejectedValue(
      new Error("Unauthorized: not a member of this group"),
    );

    const result = await updateIncome({ memberId: MEMBER_ID, income: 3000 });

    expect(result).toEqual({
      ok: false,
      error: "Unauthorized: not a member of this group",
      status: 403,
    });
  });
});

// resource-authorization: "Member Removal Authorization Is Derived From the
// Target Member's Own Group" (3b.3-3b.5).
describe("removeMember", () => {
  beforeEach(() => {
    getUserMock.mockReset();
    isGroupOwnerMock.mockReset();
    getMemberByIdMock.mockReset();
    removeMemberMock.mockReset();
  });

  it("succeeds when the owner removes a member of their own group", async () => {
    getUserMock.mockResolvedValue({ data: { user: { id: USER_ID } } });
    getMemberByIdMock.mockResolvedValue({
      id: MEMBER_ID,
      groupId: GROUP_ID,
      userId: "target-user",
    });
    isGroupOwnerMock.mockResolvedValue(true);
    removeMemberMock.mockResolvedValue(undefined);

    const result = await removeMember({
      groupId: GROUP_ID,
      memberId: MEMBER_ID,
    });

    expect(result).toEqual({ ok: true, data: { success: true } });
    expect(isGroupOwnerMock).toHaveBeenCalledWith(USER_ID, GROUP_ID);
    expect(removeMemberMock).toHaveBeenCalledWith(GROUP_ID, MEMBER_ID);
  });

  it("allows self-removal without ownership", async () => {
    getUserMock.mockResolvedValue({ data: { user: { id: USER_ID } } });
    getMemberByIdMock.mockResolvedValue({
      id: MEMBER_ID,
      groupId: GROUP_ID,
      userId: USER_ID,
    });
    isGroupOwnerMock.mockResolvedValue(false);
    removeMemberMock.mockResolvedValue(undefined);

    const result = await removeMember({
      groupId: GROUP_ID,
      memberId: MEMBER_ID,
    });

    expect(result).toEqual({ ok: true, data: { success: true } });
    expect(removeMemberMock).toHaveBeenCalledWith(GROUP_ID, MEMBER_ID);
  });

  // Threat Matrix case 5: O owns group A but submits `groupId=A` alongside a
  // memberId that actually belongs to group B — authorization MUST resolve
  // against B (the member's real group), not the caller-supplied A, and deny
  // O since O is not B's owner.
  it("rejects cross-group id substitution: caller-supplied groupId does not match the member's real group", async () => {
    getUserMock.mockResolvedValue({ data: { user: { id: USER_ID } } });
    getMemberByIdMock.mockResolvedValue({
      id: MEMBER_ID,
      groupId: OTHER_GROUP_ID,
      userId: "target-user",
    });
    isGroupOwnerMock.mockResolvedValue(false);

    const result = await removeMember({
      groupId: GROUP_ID,
      memberId: MEMBER_ID,
    });

    expect(result).toEqual({
      ok: false,
      error: "Only the owner can remove other members",
      status: 403,
    });
    // The authorization decision is derived from the member's ACTUAL group
    // (B), never the caller-supplied one (A).
    expect(isGroupOwnerMock).toHaveBeenCalledWith(USER_ID, OTHER_GROUP_ID);
    expect(isGroupOwnerMock).not.toHaveBeenCalledWith(USER_ID, GROUP_ID);
    expect(removeMemberMock).not.toHaveBeenCalled();
  });
});
