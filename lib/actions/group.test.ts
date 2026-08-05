import { describe, it, expect, vi, beforeEach } from "vitest";

// Same mocking conventions as `app/api/summary/route.test.ts` /
// `lib/server/authz.test.ts`.
const {
  getUserMock,
  isGroupMemberMock,
  isGroupOwnerMock,
  getGroupByIdMock,
  createGroupMock,
  transferOwnershipMock,
  archiveMonthMock,
  undoArchiveMock,
  createInvitationMock,
  getInvitationByTokenMock,
  acceptInvitationMock,
  rejectInvitationMock,
} = vi.hoisted(() => ({
  getUserMock: vi.fn(),
  isGroupMemberMock: vi.fn(),
  isGroupOwnerMock: vi.fn(),
  getGroupByIdMock: vi.fn(),
  createGroupMock: vi.fn(),
  transferOwnershipMock: vi.fn(),
  archiveMonthMock: vi.fn(),
  undoArchiveMock: vi.fn(),
  createInvitationMock: vi.fn(),
  getInvitationByTokenMock: vi.fn(),
  acceptInvitationMock: vi.fn(),
  rejectInvitationMock: vi.fn(),
}));

vi.mock("../supabase/server", () => ({
  createClient: vi.fn(() =>
    Promise.resolve({ auth: { getUser: getUserMock } }),
  ),
}));

vi.mock("../server/authz", () => ({
  isGroupMember: isGroupMemberMock,
  isGroupOwner: isGroupOwnerMock,
}));

vi.mock("../server/services/group", () => ({
  GroupService: {
    getGroupById: getGroupByIdMock,
    createGroup: createGroupMock,
    transferOwnership: transferOwnershipMock,
  },
}));

vi.mock("../server/services/archive", () => ({
  ArchiveService: {
    archiveMonth: archiveMonthMock,
    undoArchive: undoArchiveMock,
  },
}));

vi.mock("../server/services/invitation", () => ({
  InvitationService: {
    createInvitation: createInvitationMock,
    getInvitationByToken: getInvitationByTokenMock,
    acceptInvitation: acceptInvitationMock,
    rejectInvitation: rejectInvitationMock,
  },
}));

import {
  read,
  create,
  transferOwnership,
  archive,
  undoArchive,
  invitationCreate,
  respondInvite,
} from "./group";

const USER_ID = "11111111-1111-4111-8111-111111111111";
const GROUP_ID = "22222222-2222-4222-8222-222222222222";
const NEW_OWNER_ID = "33333333-3333-4333-8333-333333333333";

describe("read", () => {
  beforeEach(() => {
    getUserMock.mockReset();
    isGroupMemberMock.mockReset();
    getGroupByIdMock.mockReset();
  });

  // resource-authorization: "Owner reads group" scenario (3a.1).
  it("returns the group detail for its owner", async () => {
    getUserMock.mockResolvedValue({ data: { user: { id: USER_ID } } });
    isGroupMemberMock.mockResolvedValue(true);
    getGroupByIdMock.mockResolvedValue({ id: GROUP_ID, name: "Roomies" });

    const result = await read(GROUP_ID);

    expect(result).toEqual({
      ok: true,
      data: { id: GROUP_ID, name: "Roomies" },
    });
    expect(isGroupMemberMock).toHaveBeenCalledWith(USER_ID, GROUP_ID);
  });

  // resource-authorization: "Non-member denied" scenario (3a.1).
  it("denies a non-member with 403 and never touches the group service", async () => {
    getUserMock.mockResolvedValue({ data: { user: { id: USER_ID } } });
    isGroupMemberMock.mockResolvedValue(false);

    const result = await read(GROUP_ID);

    expect(result).toEqual({
      ok: false,
      error: "Access denied to this group",
      status: 403,
    });
    expect(getGroupByIdMock).not.toHaveBeenCalled();
  });

  it("denies an unauthenticated caller with 403 and never checks membership", async () => {
    getUserMock.mockResolvedValue({ data: { user: null } });

    const result = await read(GROUP_ID);

    expect(result).toEqual({ ok: false, error: "Unauthorized", status: 403 });
    expect(isGroupMemberMock).not.toHaveBeenCalled();
  });
});

describe("create", () => {
  beforeEach(() => {
    getUserMock.mockReset();
    createGroupMock.mockReset();
  });

  it("creates a group for the authenticated user", async () => {
    getUserMock.mockResolvedValue({ data: { user: { id: USER_ID } } });
    createGroupMock.mockResolvedValue({ id: GROUP_ID, name: "Roomies" });

    const result = await create({ name: "Roomies" });

    expect(result).toEqual({
      ok: true,
      data: { id: GROUP_ID, name: "Roomies" },
    });
    expect(createGroupMock).toHaveBeenCalledWith(USER_ID, "Roomies");
  });

  it("rejects a blank name with 400 and never touches the group service", async () => {
    getUserMock.mockResolvedValue({ data: { user: { id: USER_ID } } });

    const result = await create({ name: "" });

    expect(result).toEqual({
      ok: false,
      error: "Invalid group name",
      status: 400,
    });
    expect(createGroupMock).not.toHaveBeenCalled();
  });
});

// Threat Matrix case 4: "Server Action invoked with a `groupId` the caller
// does not belong to" / non-owner `transferOwnership` denial (3a.3-3a.4).
describe("transferOwnership", () => {
  beforeEach(() => {
    getUserMock.mockReset();
    isGroupOwnerMock.mockReset();
    transferOwnershipMock.mockReset();
  });

  it("denies a non-owner caller with 403 and never mutates the group", async () => {
    getUserMock.mockResolvedValue({ data: { user: { id: USER_ID } } });
    isGroupOwnerMock.mockResolvedValue(false);

    const result = await transferOwnership({
      groupId: GROUP_ID,
      newOwnerId: NEW_OWNER_ID,
    });

    expect(result).toEqual({
      ok: false,
      error: "Only the owner can transfer ownership",
      status: 403,
    });
    expect(isGroupOwnerMock).toHaveBeenCalledWith(USER_ID, GROUP_ID);
    expect(transferOwnershipMock).not.toHaveBeenCalled();
  });

  it("transfers ownership when the caller is the group's owner", async () => {
    getUserMock.mockResolvedValue({ data: { user: { id: USER_ID } } });
    isGroupOwnerMock.mockResolvedValue(true);
    transferOwnershipMock.mockResolvedValue({
      id: GROUP_ID,
      ownerId: NEW_OWNER_ID,
    });

    const result = await transferOwnership({
      groupId: GROUP_ID,
      newOwnerId: NEW_OWNER_ID,
    });

    expect(result).toEqual({
      ok: true,
      data: { id: GROUP_ID, ownerId: NEW_OWNER_ID },
    });
    expect(transferOwnershipMock).toHaveBeenCalledWith(GROUP_ID, NEW_OWNER_ID);
  });
});

// 3a.4: ownership is enforced inside `ArchiveService`; these assert the
// action surfaces that denial as a 403 `ActionResult` via `toStatus`.
describe("archive", () => {
  beforeEach(() => {
    getUserMock.mockReset();
    archiveMonthMock.mockReset();
  });

  it("denies a non-owner with 403 via the service's ownership check", async () => {
    getUserMock.mockResolvedValue({ data: { user: { id: USER_ID } } });
    archiveMonthMock.mockRejectedValue(
      new Error("Only the group owner can archive expenses"),
    );

    const result = await archive({ groupId: GROUP_ID, periodMonth: "2026-08" });

    expect(result).toEqual({
      ok: false,
      error: "Only the group owner can archive expenses",
      status: 403,
    });
  });

  it("archives the month for the owner", async () => {
    getUserMock.mockResolvedValue({ data: { user: { id: USER_ID } } });
    archiveMonthMock.mockResolvedValue({
      periodMonth: "2026-08",
      settlements: [],
    });

    const result = await archive({ groupId: GROUP_ID, periodMonth: "2026-08" });

    expect(result).toEqual({
      ok: true,
      data: { periodMonth: "2026-08", settlements: [] },
    });
    expect(archiveMonthMock).toHaveBeenCalledWith(GROUP_ID, USER_ID, "2026-08");
  });
});

describe("undoArchive", () => {
  beforeEach(() => {
    getUserMock.mockReset();
    undoArchiveMock.mockReset();
  });

  it("denies a non-owner with 403 via the service's ownership check", async () => {
    getUserMock.mockResolvedValue({ data: { user: { id: USER_ID } } });
    undoArchiveMock.mockRejectedValue(
      new Error("Only the group owner can undo archiving"),
    );

    const result = await undoArchive({
      groupId: GROUP_ID,
      periodMonth: "2026-08",
    });

    expect(result).toEqual({
      ok: false,
      error: "Only the group owner can undo archiving",
      status: 403,
    });
  });

  it("undoes the archive for the owner", async () => {
    getUserMock.mockResolvedValue({ data: { user: { id: USER_ID } } });
    undoArchiveMock.mockResolvedValue(undefined);

    const result = await undoArchive({
      groupId: GROUP_ID,
      periodMonth: "2026-08",
    });

    expect(result).toEqual({ ok: true, data: { success: true } });
  });
});

// 3a.5-3a.6: "invitation create/respondInvite — only a group member can
// create; only the invited user can respond."
describe("invitationCreate", () => {
  beforeEach(() => {
    getUserMock.mockReset();
    isGroupMemberMock.mockReset();
    createInvitationMock.mockReset();
  });

  it("denies a non-member of the group with 403 and never creates the invitation", async () => {
    getUserMock.mockResolvedValue({ data: { user: { id: USER_ID } } });
    isGroupMemberMock.mockResolvedValue(false);

    const result = await invitationCreate({
      groupId: GROUP_ID,
      email: "friend@example.com",
    });

    expect(result).toEqual({
      ok: false,
      error: "Access denied to this group",
      status: 403,
    });
    expect(createInvitationMock).not.toHaveBeenCalled();
  });

  it("creates the invitation for a member of the group", async () => {
    getUserMock.mockResolvedValue({ data: { user: { id: USER_ID } } });
    isGroupMemberMock.mockResolvedValue(true);
    createInvitationMock.mockResolvedValue({
      id: "invite-1",
      email: "friend@example.com",
    });

    const result = await invitationCreate({
      groupId: GROUP_ID,
      email: "friend@example.com",
    });

    expect(result).toEqual({
      ok: true,
      data: { id: "invite-1", email: "friend@example.com" },
    });
    expect(createInvitationMock).toHaveBeenCalledWith(
      GROUP_ID,
      USER_ID,
      "friend@example.com",
    );
  });
});

describe("respondInvite", () => {
  beforeEach(() => {
    getUserMock.mockReset();
    getInvitationByTokenMock.mockReset();
    acceptInvitationMock.mockReset();
    rejectInvitationMock.mockReset();
  });

  it("denies a caller who is not the invited user with 403 and never responds", async () => {
    getUserMock.mockResolvedValue({
      data: { user: { id: USER_ID, email: "someone-else@example.com" } },
    });
    getInvitationByTokenMock.mockResolvedValue({
      email: "invited@example.com",
    });

    const result = await respondInvite({ token: "tok-1", action: "ACCEPT" });

    expect(result).toEqual({
      ok: false,
      error: "This invitation is not addressed to you",
      status: 403,
    });
    expect(acceptInvitationMock).not.toHaveBeenCalled();
    expect(rejectInvitationMock).not.toHaveBeenCalled();
  });

  it("accepts the invitation for the invited user", async () => {
    getUserMock.mockResolvedValue({
      data: { user: { id: USER_ID, email: "invited@example.com" } },
    });
    getInvitationByTokenMock.mockResolvedValue({
      email: "invited@example.com",
    });
    acceptInvitationMock.mockResolvedValue({ status: "ACCEPTED" });

    const result = await respondInvite({ token: "tok-1", action: "ACCEPT" });

    expect(result).toEqual({ ok: true, data: { status: "ACCEPTED" } });
    expect(acceptInvitationMock).toHaveBeenCalledWith("tok-1", USER_ID);
  });

  it("rejects the invitation for the invited user", async () => {
    getUserMock.mockResolvedValue({
      data: { user: { id: USER_ID, email: "invited@example.com" } },
    });
    getInvitationByTokenMock.mockResolvedValue({
      email: "invited@example.com",
    });
    rejectInvitationMock.mockResolvedValue({ status: "DECLINED" });

    const result = await respondInvite({ token: "tok-1", action: "REJECT" });

    expect(result).toEqual({ ok: true, data: { status: "DECLINED" } });
    expect(rejectInvitationMock).toHaveBeenCalledWith("tok-1");
    expect(acceptInvitationMock).not.toHaveBeenCalled();
  });
});
