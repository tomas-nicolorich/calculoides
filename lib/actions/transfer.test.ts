import { describe, it, expect, vi, beforeEach } from "vitest";

// Same mocking conventions as `lib/actions/expense.test.ts` (4a.1).
const {
  getUserMock,
  isGroupMemberMock,
  createTransferMock,
  deleteTransferMock,
  deleteAllTransfersMock,
  getTransferGroupIdMock,
  getCategoryByIdMock,
  revalidatePathMock,
} = vi.hoisted(() => ({
  getUserMock: vi.fn(),
  isGroupMemberMock: vi.fn(),
  createTransferMock: vi.fn(),
  deleteTransferMock: vi.fn(),
  deleteAllTransfersMock: vi.fn(),
  getTransferGroupIdMock: vi.fn(),
  getCategoryByIdMock: vi.fn(),
  revalidatePathMock: vi.fn(),
}));

vi.mock("../supabase/server", () => ({
  createClient: vi.fn(() =>
    Promise.resolve({ auth: { getUser: getUserMock } }),
  ),
}));

vi.mock("../server/authz", () => ({
  isGroupMember: isGroupMemberMock,
}));

vi.mock("../server/services/transfer", () => ({
  TransferService: {
    createTransfer: createTransferMock,
    deleteTransfer: deleteTransferMock,
    deleteAllTransfers: deleteAllTransfersMock,
    getTransferGroupId: getTransferGroupIdMock,
  },
}));

vi.mock("../server/services/budget", () => ({
  BudgetService: {
    getCategoryById: getCategoryByIdMock,
  },
}));

vi.mock("next/cache", () => ({
  revalidatePath: revalidatePathMock,
}));

import { createTransfer, deleteTransfer, deleteAll } from "./transfer";

const USER_ID = "11111111-1111-4111-8111-111111111111";
const GROUP_ID = "22222222-2222-4222-8222-222222222222";
const CATEGORY_ID = "33333333-3333-4333-8333-333333333333";
const TRANSFER_ID = "44444444-4444-4444-8444-444444444444";
const FROM_MEMBER_ID = "55555555-5555-4555-8555-555555555555";
const TO_MEMBER_ID = "66666666-6666-4666-8666-666666666666";

// resource-authorization: "Group-Scoped Budget Resources Require Membership"
// (5.1) — `TransferService.createTransfer` derives the group from
// `categoryId` (the resource being written into) and checks caller
// membership against it internally; the action surfaces that denial as a
// 403 `ActionResult`, same precedent as `expense.ts`'s `create` (4a.1).
describe("createTransfer", () => {
  beforeEach(() => {
    getUserMock.mockReset();
    createTransferMock.mockReset();
    getCategoryByIdMock.mockReset();
    revalidatePathMock.mockReset();
  });

  it("creates a transfer for a member of the category's group", async () => {
    getUserMock.mockResolvedValue({ data: { user: { id: USER_ID } } });
    createTransferMock.mockResolvedValue({
      id: TRANSFER_ID,
      categoryId: CATEGORY_ID,
      amount: 50,
    });
    getCategoryByIdMock.mockResolvedValue({
      id: CATEGORY_ID,
      groupId: GROUP_ID,
    });

    const result = await createTransfer({
      categoryId: CATEGORY_ID,
      fromMemberId: FROM_MEMBER_ID,
      toMemberId: TO_MEMBER_ID,
      amount: 50,
    });

    expect(result).toEqual({
      ok: true,
      data: { id: TRANSFER_ID, categoryId: CATEGORY_ID, amount: 50 },
    });
    expect(createTransferMock).toHaveBeenCalledWith(
      CATEGORY_ID,
      FROM_MEMBER_ID,
      TO_MEMBER_ID,
      50,
      USER_ID,
    );
    expect(revalidatePathMock).toHaveBeenCalledWith(`/dashboard/${GROUP_ID}`);
  });

  it("denies a non-member with 403 via the service's membership check", async () => {
    getUserMock.mockResolvedValue({ data: { user: { id: USER_ID } } });
    createTransferMock.mockRejectedValue(
      new Error("Not a member of this group"),
    );

    const result = await createTransfer({
      categoryId: CATEGORY_ID,
      fromMemberId: FROM_MEMBER_ID,
      toMemberId: TO_MEMBER_ID,
      amount: 50,
    });

    expect(result).toEqual({
      ok: false,
      error: "Not a member of this group",
      status: 403,
    });
  });

  it("rejects an unauthenticated caller with 403 and never touches the service", async () => {
    getUserMock.mockResolvedValue({ data: { user: null } });

    const result = await createTransfer({
      categoryId: CATEGORY_ID,
      fromMemberId: FROM_MEMBER_ID,
      toMemberId: TO_MEMBER_ID,
      amount: 50,
    });

    expect(result).toEqual({ ok: false, error: "Unauthorized", status: 403 });
    expect(createTransferMock).not.toHaveBeenCalled();
    expect(revalidatePathMock).not.toHaveBeenCalled();
  });
});

// Threat Matrix case 5 (cross-group id substitution, 5.3-5.4): this schema
// carries no `groupId` at all — `TransferService.deleteTransfer` resolves
// the authorization group strictly from the *existing* transfer's own
// `category.groupId`, never from a caller-supplied value. Same
// resource-derivation precedent as `expense.ts`'s `deleteExpense` (4a.3-4a.4).
describe("deleteTransfer", () => {
  beforeEach(() => {
    getUserMock.mockReset();
    deleteTransferMock.mockReset();
    getTransferGroupIdMock.mockReset();
    revalidatePathMock.mockReset();
  });

  it("deletes the transfer for a member of its own group", async () => {
    getUserMock.mockResolvedValue({ data: { user: { id: USER_ID } } });
    getTransferGroupIdMock.mockResolvedValue(GROUP_ID);
    deleteTransferMock.mockResolvedValue({ id: TRANSFER_ID });

    const result = await deleteTransfer({ transferId: TRANSFER_ID });

    expect(result).toEqual({ ok: true, data: { success: true } });
    expect(deleteTransferMock).toHaveBeenCalledWith(TRANSFER_ID, USER_ID);
    expect(revalidatePathMock).toHaveBeenCalledWith(`/dashboard/${GROUP_ID}`);
  });

  it("rejects cross-group id substitution: caller is not a member of the transfer's actual group", async () => {
    getUserMock.mockResolvedValue({ data: { user: { id: USER_ID } } });
    getTransferGroupIdMock.mockResolvedValue(GROUP_ID);
    deleteTransferMock.mockRejectedValue(
      new Error("Not a member of this group"),
    );

    const result = await deleteTransfer({ transferId: TRANSFER_ID });

    expect(result).toEqual({
      ok: false,
      error: "Not a member of this group",
      status: 403,
    });
    expect(revalidatePathMock).not.toHaveBeenCalled();
  });

  it("returns 404 when the transfer does not exist", async () => {
    getUserMock.mockResolvedValue({ data: { user: { id: USER_ID } } });
    getTransferGroupIdMock.mockResolvedValue(null);
    deleteTransferMock.mockRejectedValue(new Error("Transfer not found"));

    const result = await deleteTransfer({ transferId: TRANSFER_ID });

    expect(result).toEqual({
      ok: false,
      error: "Transfer not found",
      status: 404,
    });
    expect(revalidatePathMock).not.toHaveBeenCalled();
  });
});

// `TransferService.deleteAllTransfers(groupId)` performs no membership check
// of its own — the action layer MUST enforce membership itself before the
// bulk delete runs (mirrors the legacy `requireGroupAccess` guard in
// `api/_src/handlers/transactions.ts`'s `transfers-delete-all` route).
describe("deleteAll", () => {
  beforeEach(() => {
    getUserMock.mockReset();
    isGroupMemberMock.mockReset();
    deleteAllTransfersMock.mockReset();
    revalidatePathMock.mockReset();
  });

  it("deletes every transfer in the group for a member", async () => {
    getUserMock.mockResolvedValue({ data: { user: { id: USER_ID } } });
    isGroupMemberMock.mockResolvedValue(true);
    deleteAllTransfersMock.mockResolvedValue({ count: 3 });

    const result = await deleteAll({ groupId: GROUP_ID });

    expect(result).toEqual({ ok: true, data: { count: 3 } });
    expect(isGroupMemberMock).toHaveBeenCalledWith(USER_ID, GROUP_ID);
    expect(deleteAllTransfersMock).toHaveBeenCalledWith(GROUP_ID);
    expect(revalidatePathMock).toHaveBeenCalledWith(`/dashboard/${GROUP_ID}`);
  });

  it("denies a non-member with 403 and never touches the service", async () => {
    getUserMock.mockResolvedValue({ data: { user: { id: USER_ID } } });
    isGroupMemberMock.mockResolvedValue(false);

    const result = await deleteAll({ groupId: GROUP_ID });

    expect(result).toEqual({
      ok: false,
      error: "Access denied to this group",
      status: 403,
    });
    expect(deleteAllTransfersMock).not.toHaveBeenCalled();
    expect(revalidatePathMock).not.toHaveBeenCalled();
  });
});
