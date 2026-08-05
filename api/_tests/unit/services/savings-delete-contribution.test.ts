import { describe, it, expect, vi, beforeEach, Mock } from "vitest";
import { SavingsService } from "../../../../lib/server/services/savings";

// ── Prisma mock ──────────────────────────────────────────────────────────────
vi.mock("../../../_src/utils/prisma", () => ({
  prisma: {
    savingsGoal: {
      findUnique: vi.fn(),
    },
    groupMember: {
      findUnique: vi.fn(),
      findFirst: vi.fn(),
    },
    savingsGoalContribution: {
      deleteMany: vi.fn(),
    },
  },
}));

import { prisma } from "../../../_src/utils/prisma";
const mockPrisma = prisma as unknown as {
  savingsGoal: { findUnique: Mock };
  groupMember: { findUnique: Mock; findFirst: Mock };
  savingsGoalContribution: { deleteMany: Mock };
};

const GOAL_ID = "550e8400-e29b-41d4-a716-446655440001";
const MEMBER_ID = "550e8400-e29b-41d4-a716-446655440002";
const GROUP_ID = "550e8400-e29b-41d4-a716-446655440003";
const OTHER_GROUP_ID = "550e8400-e29b-41d4-a716-446655440004";
const CALLER_USER_ID = "550e8400-e29b-41d4-a716-446655440005";

describe("SavingsService.deleteContribution", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("deletes the contribution row for the goal/member pair", async () => {
    mockPrisma.savingsGoal.findUnique.mockResolvedValue({
      id: GOAL_ID,
      groupId: GROUP_ID,
    });
    mockPrisma.groupMember.findUnique.mockResolvedValue({
      id: MEMBER_ID,
      groupId: GROUP_ID,
    });
    mockPrisma.groupMember.findFirst.mockResolvedValue({ id: MEMBER_ID });
    mockPrisma.savingsGoalContribution.deleteMany.mockResolvedValue({
      count: 1,
    });

    await SavingsService.deleteContribution(GOAL_ID, MEMBER_ID, CALLER_USER_ID);

    expect(mockPrisma.savingsGoalContribution.deleteMany).toHaveBeenCalledWith({
      where: { goalId: GOAL_ID, memberId: MEMBER_ID },
    });
  });

  it("is a no-op (does not throw) when no contribution row exists for the pair", async () => {
    mockPrisma.savingsGoal.findUnique.mockResolvedValue({
      id: GOAL_ID,
      groupId: GROUP_ID,
    });
    mockPrisma.groupMember.findUnique.mockResolvedValue({
      id: MEMBER_ID,
      groupId: GROUP_ID,
    });
    mockPrisma.groupMember.findFirst.mockResolvedValue({ id: MEMBER_ID });
    mockPrisma.savingsGoalContribution.deleteMany.mockResolvedValue({
      count: 0,
    });

    await expect(
      SavingsService.deleteContribution(GOAL_ID, MEMBER_ID, CALLER_USER_ID),
    ).resolves.not.toThrow();
  });

  it("throws when the goal does not exist", async () => {
    mockPrisma.savingsGoal.findUnique.mockResolvedValue(null);
    mockPrisma.groupMember.findUnique.mockResolvedValue({
      id: MEMBER_ID,
      groupId: GROUP_ID,
    });

    await expect(
      SavingsService.deleteContribution(GOAL_ID, MEMBER_ID, CALLER_USER_ID),
    ).rejects.toThrow("Savings goal not found");
    expect(
      mockPrisma.savingsGoalContribution.deleteMany,
    ).not.toHaveBeenCalled();
  });

  it("throws when the member does not exist", async () => {
    mockPrisma.savingsGoal.findUnique.mockResolvedValue({
      id: GOAL_ID,
      groupId: GROUP_ID,
    });
    mockPrisma.groupMember.findUnique.mockResolvedValue(null);

    await expect(
      SavingsService.deleteContribution(GOAL_ID, MEMBER_ID, CALLER_USER_ID),
    ).rejects.toThrow("Group member not found");
    expect(
      mockPrisma.savingsGoalContribution.deleteMany,
    ).not.toHaveBeenCalled();
  });

  it("throws when the member does not belong to the goal's group", async () => {
    mockPrisma.savingsGoal.findUnique.mockResolvedValue({
      id: GOAL_ID,
      groupId: GROUP_ID,
    });
    mockPrisma.groupMember.findUnique.mockResolvedValue({
      id: MEMBER_ID,
      groupId: OTHER_GROUP_ID,
    });

    await expect(
      SavingsService.deleteContribution(GOAL_ID, MEMBER_ID, CALLER_USER_ID),
    ).rejects.toThrow(
      "Member does not belong to the group associated with this savings goal",
    );
    expect(
      mockPrisma.savingsGoalContribution.deleteMany,
    ).not.toHaveBeenCalled();
  });

  it("throws when the caller does not belong to the goal's group (IDOR guard)", async () => {
    mockPrisma.savingsGoal.findUnique.mockResolvedValue({
      id: GOAL_ID,
      groupId: GROUP_ID,
    });
    mockPrisma.groupMember.findUnique.mockResolvedValue({
      id: MEMBER_ID,
      groupId: GROUP_ID,
    });
    mockPrisma.groupMember.findFirst.mockResolvedValue(null);

    await expect(
      SavingsService.deleteContribution(GOAL_ID, MEMBER_ID, CALLER_USER_ID),
    ).rejects.toThrow(
      "User does not belong to the group associated with this savings goal",
    );
    expect(
      mockPrisma.savingsGoalContribution.deleteMany,
    ).not.toHaveBeenCalled();
  });
});
