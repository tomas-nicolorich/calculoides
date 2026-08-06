import { describe, it, expect, vi, beforeEach } from "vitest";

// Same mocking conventions as `lib/actions/transfer.test.ts` (5.1/5.3).
const {
  getUserMock,
  isGroupMemberMock,
  createGoalMock,
  updateGoalMock,
  deleteGoalMock,
  upsertContributionMock,
  deleteContributionMock,
  getGoalGroupIdMock,
  revalidatePathMock,
} = vi.hoisted(() => ({
  getUserMock: vi.fn(),
  isGroupMemberMock: vi.fn(),
  createGoalMock: vi.fn(),
  updateGoalMock: vi.fn(),
  deleteGoalMock: vi.fn(),
  upsertContributionMock: vi.fn(),
  deleteContributionMock: vi.fn(),
  getGoalGroupIdMock: vi.fn(),
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

vi.mock("../server/services/savings", () => ({
  SavingsService: {
    createGoal: createGoalMock,
    updateGoal: updateGoalMock,
    deleteGoal: deleteGoalMock,
    upsertContribution: upsertContributionMock,
    deleteContribution: deleteContributionMock,
    getGoalGroupId: getGoalGroupIdMock,
  },
}));

vi.mock("next/cache", () => ({
  revalidatePath: revalidatePathMock,
}));

import {
  create,
  update,
  deleteGoal,
  contributionUpsert,
  contributionDelete,
} from "./savings";

const USER_ID = "11111111-1111-4111-8111-111111111111";
const GROUP_ID = "22222222-2222-4222-8222-222222222222";
const OTHER_GROUP_ID = "77777777-7777-4777-8777-777777777777";
const GOAL_ID = "33333333-3333-4333-8333-333333333333";
const MEMBER_ID = "44444444-4444-4444-8444-444444444444";
const TARGET_DATE = "2027-01-01T00:00:00.000Z";

// resource-authorization: "Group-Scoped Budget Resources Require Membership"
// (6a.1). `SavingsService.createGoal` performs NO membership check of its
// own (unlike `updateGoal`/`deleteGoal`) — same pre-existing gap 4b.2 found
// for `BudgetService.createCategory` — so the action enforces membership
// itself before the write.
describe("create", () => {
  beforeEach(() => {
    getUserMock.mockReset();
    isGroupMemberMock.mockReset();
    createGoalMock.mockReset();
    revalidatePathMock.mockReset();
  });

  it("creates a savings goal for a member of the group", async () => {
    getUserMock.mockResolvedValue({ data: { user: { id: USER_ID } } });
    isGroupMemberMock.mockResolvedValue(true);
    createGoalMock.mockResolvedValue({
      id: GOAL_ID,
      groupId: GROUP_ID,
      name: "Vacation",
      targetAmount: 1000,
    });

    const result = await create({
      groupId: GROUP_ID,
      name: "Vacation",
      targetAmount: 1000,
      currentAmount: 0,
      targetDate: TARGET_DATE,
    });

    expect(result).toEqual({
      ok: true,
      data: {
        id: GOAL_ID,
        groupId: GROUP_ID,
        name: "Vacation",
        targetAmount: 1000,
      },
    });
    expect(isGroupMemberMock).toHaveBeenCalledWith(USER_ID, GROUP_ID);
    expect(createGoalMock).toHaveBeenCalledWith(
      GROUP_ID,
      "Vacation",
      1000,
      new Date(TARGET_DATE),
      0,
      undefined,
    );
    expect(revalidatePathMock).toHaveBeenCalledWith(`/dashboard/${GROUP_ID}`);
  });

  it("denies a non-member with 403 and never touches the service", async () => {
    getUserMock.mockResolvedValue({ data: { user: { id: USER_ID } } });
    isGroupMemberMock.mockResolvedValue(false);

    const result = await create({
      groupId: GROUP_ID,
      name: "Vacation",
      targetAmount: 1000,
      currentAmount: 0,
      targetDate: TARGET_DATE,
    });

    expect(result).toEqual({
      ok: false,
      error: "Access denied to this group",
      status: 403,
    });
    expect(createGoalMock).not.toHaveBeenCalled();
    expect(revalidatePathMock).not.toHaveBeenCalled();
  });

  it("rejects an unauthenticated caller with 403 and never touches the service", async () => {
    getUserMock.mockResolvedValue({ data: { user: null } });

    const result = await create({
      groupId: GROUP_ID,
      name: "Vacation",
      targetAmount: 1000,
      currentAmount: 0,
      targetDate: TARGET_DATE,
    });

    expect(result).toEqual({ ok: false, error: "Unauthorized", status: 403 });
    expect(isGroupMemberMock).not.toHaveBeenCalled();
    expect(createGoalMock).not.toHaveBeenCalled();
  });
});

// `SavingsService.updateGoal` derives the group from the *existing* goal's
// own record and checks caller membership internally (throws "Savings goal
// not found" / "Not a member of this group") — same non-duplication
// precedent as `category.ts`'s `update` (4b.2) and `expense.ts`'s `update`
// (4a.4).
describe("update", () => {
  beforeEach(() => {
    getUserMock.mockReset();
    updateGoalMock.mockReset();
    revalidatePathMock.mockReset();
  });

  it("updates the goal for a member of its own group", async () => {
    getUserMock.mockResolvedValue({ data: { user: { id: USER_ID } } });
    updateGoalMock.mockResolvedValue({
      id: GOAL_ID,
      groupId: GROUP_ID,
      name: "Vacation 2",
      targetAmount: 2000,
    });

    const result = await update({
      goalId: GOAL_ID,
      name: "Vacation 2",
      targetAmount: 2000,
      currentAmount: 100,
      targetDate: TARGET_DATE,
    });

    expect(result).toEqual({
      ok: true,
      data: {
        id: GOAL_ID,
        groupId: GROUP_ID,
        name: "Vacation 2",
        targetAmount: 2000,
      },
    });
    expect(updateGoalMock).toHaveBeenCalledWith(
      GOAL_ID,
      "Vacation 2",
      2000,
      new Date(TARGET_DATE),
      100,
      USER_ID,
      undefined,
    );
    expect(revalidatePathMock).toHaveBeenCalledWith(`/dashboard/${GROUP_ID}`);
  });

  // Threat Matrix case 5 (cross-group id substitution): the caller belongs
  // to a different group than the goal itself — the service's own
  // membership check (derived from the goal's own `groupId`) denies it.
  it("rejects a caller who is not a member of the goal's own group", async () => {
    getUserMock.mockResolvedValue({ data: { user: { id: USER_ID } } });
    updateGoalMock.mockRejectedValue(new Error("Not a member of this group"));

    const result = await update({
      goalId: GOAL_ID,
      name: "Vacation 2",
      targetAmount: 2000,
      currentAmount: 100,
      targetDate: TARGET_DATE,
    });

    expect(result).toEqual({
      ok: false,
      error: "Not a member of this group",
      status: 403,
    });
    expect(revalidatePathMock).not.toHaveBeenCalled();
  });

  it("returns 404 when the goal does not exist", async () => {
    getUserMock.mockResolvedValue({ data: { user: { id: USER_ID } } });
    updateGoalMock.mockRejectedValue(new Error("Savings goal not found"));

    const result = await update({
      goalId: GOAL_ID,
      name: "Vacation 2",
      targetAmount: 2000,
      currentAmount: 100,
      targetDate: TARGET_DATE,
    });

    expect(result).toEqual({
      ok: false,
      error: "Savings goal not found",
      status: 404,
    });
  });
});

// Same resource-derivation precedent as `transfer.ts`'s `deleteTransfer`
// (5.4): `goalId` is the only identifier accepted, and
// `SavingsService.deleteGoal` derives the authorization group from the
// goal's own record.
describe("deleteGoal", () => {
  beforeEach(() => {
    getUserMock.mockReset();
    deleteGoalMock.mockReset();
    getGoalGroupIdMock.mockReset();
    revalidatePathMock.mockReset();
  });

  it("deletes the goal for a member of its own group", async () => {
    getUserMock.mockResolvedValue({ data: { user: { id: USER_ID } } });
    getGoalGroupIdMock.mockResolvedValue(GROUP_ID);
    deleteGoalMock.mockResolvedValue({ id: GOAL_ID });

    const result = await deleteGoal({ goalId: GOAL_ID });

    expect(result).toEqual({ ok: true, data: { success: true } });
    expect(deleteGoalMock).toHaveBeenCalledWith(GOAL_ID, USER_ID);
    expect(revalidatePathMock).toHaveBeenCalledWith(`/dashboard/${GROUP_ID}`);
  });

  it("rejects a caller who is not a member of the goal's own group", async () => {
    getUserMock.mockResolvedValue({ data: { user: { id: USER_ID } } });
    getGoalGroupIdMock.mockResolvedValue(GROUP_ID);
    deleteGoalMock.mockRejectedValue(
      new Error(
        "User does not belong to the group associated with this savings goal",
      ),
    );

    const result = await deleteGoal({ goalId: GOAL_ID });

    expect(result).toEqual({
      ok: false,
      error:
        "User does not belong to the group associated with this savings goal",
      status: 403,
    });
    expect(revalidatePathMock).not.toHaveBeenCalled();
  });

  it("returns 404 when the goal does not exist", async () => {
    getUserMock.mockResolvedValue({ data: { user: { id: USER_ID } } });
    getGoalGroupIdMock.mockResolvedValue(null);
    deleteGoalMock.mockRejectedValue(new Error("Savings goal not found"));

    const result = await deleteGoal({ goalId: GOAL_ID });

    expect(result).toEqual({
      ok: false,
      error: "Savings goal not found",
      status: 404,
    });
    expect(revalidatePathMock).not.toHaveBeenCalled();
  });
});

// `SavingsService.upsertContribution` validates that `goalId` and `memberId`
// belong to the SAME group before writing — the literal Threat Matrix case 5
// shape (two ids, one substituted from another group), same class as
// `member.ts`'s `removeMember` cross-group test (3b.4).
describe("contributionUpsert", () => {
  beforeEach(() => {
    getUserMock.mockReset();
    upsertContributionMock.mockReset();
    getGoalGroupIdMock.mockReset();
    revalidatePathMock.mockReset();
  });

  it("upserts a contribution for a member of the goal's own group", async () => {
    getUserMock.mockResolvedValue({ data: { user: { id: USER_ID } } });
    getGoalGroupIdMock.mockResolvedValue(GROUP_ID);
    upsertContributionMock.mockResolvedValue({
      goalId: GOAL_ID,
      memberId: MEMBER_ID,
      customAmount: 75,
    });

    const result = await contributionUpsert({
      goalId: GOAL_ID,
      memberId: MEMBER_ID,
      amount: 75,
    });

    expect(result).toEqual({
      ok: true,
      data: { goalId: GOAL_ID, memberId: MEMBER_ID, customAmount: 75 },
    });
    expect(upsertContributionMock).toHaveBeenCalledWith(
      GOAL_ID,
      MEMBER_ID,
      75,
      USER_ID,
    );
    expect(revalidatePathMock).toHaveBeenCalledWith(`/dashboard/${GROUP_ID}`);
  });

  // Threat Matrix case 5: `memberId` belongs to a different group (B) than
  // the goal (A, `OTHER_GROUP_ID` here for illustration) — the service
  // rejects the mismatch itself, the action just surfaces it.
  it("rejects cross-group id substitution: memberId belongs to a different group than the goal", async () => {
    getUserMock.mockResolvedValue({ data: { user: { id: USER_ID } } });
    getGoalGroupIdMock.mockResolvedValue(OTHER_GROUP_ID);
    upsertContributionMock.mockRejectedValue(
      new Error(
        "Member does not belong to the group associated with this savings goal",
      ),
    );

    const result = await contributionUpsert({
      goalId: GOAL_ID,
      memberId: MEMBER_ID,
      amount: 75,
    });

    expect(result).toEqual({
      ok: false,
      error:
        "Member does not belong to the group associated with this savings goal",
      status: 403,
    });
    expect(revalidatePathMock).not.toHaveBeenCalled();
  });

  it("returns 404 when the goal does not exist", async () => {
    getUserMock.mockResolvedValue({ data: { user: { id: USER_ID } } });
    getGoalGroupIdMock.mockResolvedValue(null);
    upsertContributionMock.mockRejectedValue(
      new Error("Savings goal not found"),
    );

    const result = await contributionUpsert({
      goalId: GOAL_ID,
      memberId: MEMBER_ID,
      amount: 75,
    });

    expect(result).toEqual({
      ok: false,
      error: "Savings goal not found",
      status: 404,
    });
  });
});

describe("contributionDelete", () => {
  beforeEach(() => {
    getUserMock.mockReset();
    deleteContributionMock.mockReset();
    getGoalGroupIdMock.mockReset();
    revalidatePathMock.mockReset();
  });

  it("deletes a contribution override for a member of the goal's own group", async () => {
    getUserMock.mockResolvedValue({ data: { user: { id: USER_ID } } });
    getGoalGroupIdMock.mockResolvedValue(GROUP_ID);
    deleteContributionMock.mockResolvedValue(undefined);

    const result = await contributionDelete({
      goalId: GOAL_ID,
      memberId: MEMBER_ID,
    });

    expect(result).toEqual({ ok: true, data: { success: true } });
    expect(deleteContributionMock).toHaveBeenCalledWith(
      GOAL_ID,
      MEMBER_ID,
      USER_ID,
    );
    expect(revalidatePathMock).toHaveBeenCalledWith(`/dashboard/${GROUP_ID}`);
  });

  it("rejects cross-group id substitution: memberId belongs to a different group than the goal", async () => {
    getUserMock.mockResolvedValue({ data: { user: { id: USER_ID } } });
    getGoalGroupIdMock.mockResolvedValue(OTHER_GROUP_ID);
    deleteContributionMock.mockRejectedValue(
      new Error(
        "Member does not belong to the group associated with this savings goal",
      ),
    );

    const result = await contributionDelete({
      goalId: GOAL_ID,
      memberId: MEMBER_ID,
    });

    expect(result).toEqual({
      ok: false,
      error:
        "Member does not belong to the group associated with this savings goal",
      status: 403,
    });
    expect(revalidatePathMock).not.toHaveBeenCalled();
  });
});
