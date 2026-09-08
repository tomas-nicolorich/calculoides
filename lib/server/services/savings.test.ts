/* eslint-disable @typescript-eslint/unbound-method, @typescript-eslint/no-explicit-any, @typescript-eslint/no-unsafe-argument */
import { describe, it, expect, vi, beforeEach } from "vitest";
import { SavingsService } from "./savings";
import { prisma } from "../../prisma";

/**
 * Rehomed from `api/_tests/integration/savings.test.ts` /
 * `api/_tests/unit/services/savings-delete-contribution.test.ts` (6b.5) —
 * that suite exercised this exact business logic (BUG-036 zero-amount
 * serialization, remainingBalance ceiling, override merge, varianceMonths
 * edge case, contribution-delete-then-relist, delete-goal IDOR) through the
 * now-deleted `transactionsHandler`, which was a thin pass-through to
 * `SavingsService` with no extra logic of its own — so calling
 * `SavingsService` directly here preserves the identical coverage. Mirrors
 * `lib/server/services/summary.test.ts`'s rehoming precedent (Phase 2).
 */
vi.mock("../../prisma", () => ({
  prisma: {
    savingsGoal: {
      create: vi.fn(),
      findUnique: vi.fn(),
      update: vi.fn(),
      findMany: vi.fn(),
      delete: vi.fn(),
    },
    groupMember: {
      findFirst: vi.fn(),
      findUnique: vi.fn(),
      findMany: vi.fn(),
    },
    category: {
      findMany: vi.fn(),
    },
    expense: {
      findMany: vi.fn(),
    },
    transfer: {
      findMany: vi.fn(),
    },
    savingsGoalContribution: {
      deleteMany: vi.fn(),
    },
  },
}));

const GROUP_ID = "550e8400-e29b-41d4-a716-446655440001";

describe("SavingsService.createGoal", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // BUG-036: a legitimate `currentAmount = 0` must not be dropped/coerced
  // to a truthy default anywhere in the write path.
  it("correctly persists currentAmount = 0 (BUG-036)", async () => {
    const targetDate = new Date("2027-01-01");
    vi.mocked(prisma.savingsGoal.create).mockResolvedValue({
      id: "goal-1",
      groupId: GROUP_ID,
      name: "New Car",
      targetAmount: 5000,
      currentAmount: 0,
      targetDate,
    } as any);

    const goal = await SavingsService.createGoal(
      GROUP_ID,
      "New Car",
      5000,
      targetDate,
      0,
    );

    expect(prisma.savingsGoal.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ currentAmount: 0 }) as unknown,
      }),
    );
    expect(goal.currentAmount).toBe(0);
  });

  // BUG-036: `currentAmount` defaults to 0 when the caller omits it.
  it("defaults currentAmount to 0 when omitted", async () => {
    const targetDate = new Date("2027-01-01");
    vi.mocked(prisma.savingsGoal.create).mockResolvedValue({
      id: "goal-1",
      groupId: GROUP_ID,
      name: "New Car",
      targetAmount: 5000,
      currentAmount: 0,
      targetDate,
    } as any);

    await SavingsService.createGoal(GROUP_ID, "New Car", 5000, targetDate);

    expect(prisma.savingsGoal.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ currentAmount: 0 }) as unknown,
      }),
    );
  });
});

describe("SavingsService.getGoalsForGroup", () => {
  function mockGroupData(
    contributions: { memberId: string; customAmount: number }[],
  ) {
    const targetDate = new Date();
    targetDate.setMonth(targetDate.getMonth() + 5);

    vi.mocked(prisma.groupMember.findMany).mockResolvedValue([
      {
        id: "m1",
        income: 600,
        user: { name: "Alice", email: "alice@x.com" },
      },
      {
        id: "m2",
        income: 400,
        user: { name: "Bob", email: "bob@x.com" },
      },
    ] as any);

    vi.mocked(prisma.savingsGoal.findMany).mockResolvedValue([
      {
        id: "goal-1",
        groupId: GROUP_ID,
        name: "Car",
        icon: null,
        targetAmount: 1200,
        currentAmount: 200,
        targetDate,
        contributions: contributions.map((c) => ({
          goalId: "goal-1",
          memberId: c.memberId,
          customAmount: c.customAmount,
        })),
      },
    ] as any);

    vi.mocked(prisma.category.findMany).mockResolvedValue([
      {
        id: "cat-1",
        monthlyBudget: 100,
        memberLinks: [],
      },
    ] as any);

    vi.mocked(prisma.expense.findMany).mockResolvedValue([]);
    vi.mocked(prisma.transfer.findMany).mockResolvedValue([]);
  }

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("attaches breakdown[].remainingBalance = income - budgeted per member", async () => {
    mockGroupData([]);

    const [goal] = await SavingsService.getGoalsForGroup(GROUP_ID);

    const alice = goal.breakdown.find((b) => b.memberId === "m1");
    const bob = goal.breakdown.find((b) => b.memberId === "m2");

    // income 600, category budget 100 unrestricted -> quota 60 -> ceiling 540
    expect(alice?.remainingBalance).toBe(540);
    // income 400, category budget 100 unrestricted -> quota 40 -> ceiling 360
    expect(bob?.remainingBalance).toBe(360);
  });

  it("leaves proportionalAmount/actualAmount allocation values unchanged by the remainingBalance field", async () => {
    mockGroupData([{ memberId: "m2", customAmount: 999 }]);

    const [goal] = await SavingsService.getGoalsForGroup(GROUP_ID);

    const alice = goal.breakdown.find((b) => b.memberId === "m1");
    const bob = goal.breakdown.find((b) => b.memberId === "m2");

    // Allocation split is untouched by the ceiling addition (60/40 income share).
    // Divisor corrected by calculateMonthsRemaining (issue #159): raw diff 5 -> 4 months -> 250/month total.
    expect(alice?.proportionalAmount).toBe(150);
    expect(alice?.actualAmount).toBe(150);
    expect(bob?.proportionalAmount).toBe(100);
    // Override still applies exactly as before.
    expect(bob?.actualAmount).toBe(999);
    expect(bob?.isOverridden).toBe(true);
    // remainingBalance is independent of the override.
    expect(bob?.remainingBalance).toBe(360);
  });

  it("reports varianceMonths = 0 when the projected date lands exactly on the target date", async () => {
    // Overridden contributions totaling 200/mo pay off the remaining 1000
    // (targetAmount 1200 - currentAmount 200) in ceil(1000/200) = 5 months,
    // matching the mock's targetDate (now + 5 months) day-for-day.
    mockGroupData([
      { memberId: "m1", customAmount: 200 },
      { memberId: "m2", customAmount: 0 },
    ]);

    const [goal] = await SavingsService.getGoalsForGroup(GROUP_ID);

    expect(goal.varianceMonths).toBe(0);
  });
});

describe("SavingsService.deleteContribution then getGoalsForGroup — issue #161", () => {
  const goalId = "550e8400-e29b-41d4-a716-446655440005";
  const memberId = "550e8400-e29b-41d4-a716-446655440006";

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("removes the override row, and a subsequent list recomputes actualAmount from live base (no getGoalsForGroup merge-logic change)", async () => {
    vi.mocked(prisma.savingsGoal.findUnique).mockResolvedValue({
      id: goalId,
      groupId: GROUP_ID,
    } as any);
    vi.mocked(prisma.groupMember.findUnique).mockResolvedValue({
      id: memberId,
      groupId: GROUP_ID,
    } as any);
    vi.mocked(prisma.groupMember.findFirst).mockResolvedValue({
      id: "member-caller",
    } as any);
    vi.mocked(prisma.savingsGoalContribution.deleteMany).mockResolvedValue({
      count: 1,
    });

    await SavingsService.deleteContribution(goalId, memberId, "user-1");

    expect(prisma.savingsGoalContribution.deleteMany).toHaveBeenCalledWith({
      where: { goalId, memberId },
    });

    // Simulate the post-delete DB state: getGoalsForGroup's own findMany now
    // returns no contribution row for this goal/member — the merge logic in
    // SavingsService.getGoalsForGroup is untouched (design: "Backend
    // getGoalsForGroup merge is unchanged — removing a row makes it
    // recompute base").
    const targetDate = new Date();
    targetDate.setMonth(targetDate.getMonth() + 5);

    vi.mocked(prisma.groupMember.findMany).mockResolvedValue([
      {
        id: memberId,
        income: 1000,
        user: { name: "Dave", email: "dave@x.com" },
      },
    ] as any);

    vi.mocked(prisma.savingsGoal.findMany).mockResolvedValue([
      {
        id: goalId,
        groupId: GROUP_ID,
        name: "Trip",
        icon: null,
        targetAmount: 1200,
        currentAmount: 200,
        targetDate,
        contributions: [], // row was deleted — no override remains
      },
    ] as any);

    vi.mocked(prisma.category.findMany).mockResolvedValue([]);
    vi.mocked(prisma.expense.findMany).mockResolvedValue([]);
    vi.mocked(prisma.transfer.findMany).mockResolvedValue([]);

    const [goal] = await SavingsService.getGoalsForGroup(GROUP_ID);
    const member = goal.breakdown.find((b) => b.memberId === memberId);

    expect(member?.isOverridden).toBe(false);
    expect(member?.actualAmount).toBe(member?.proportionalAmount);
  });
});

describe("SavingsService.deleteGoal — IDOR", () => {
  const goalId = "550e8400-e29b-41d4-a716-446655440005";

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("rejects deleting a goal when the requesting user is not a member of the goal's group", async () => {
    vi.mocked(prisma.savingsGoal.findUnique).mockResolvedValue({
      id: goalId,
      groupId: GROUP_ID,
    } as any);
    vi.mocked(prisma.groupMember.findUnique).mockResolvedValue(null);

    await expect(SavingsService.deleteGoal(goalId, "user-1")).rejects.toThrow(
      "User does not belong to the group associated with this savings goal",
    );

    expect(prisma.savingsGoal.delete).not.toHaveBeenCalled();
  });

  it("deletes the goal when the requesting user belongs to the goal's group", async () => {
    vi.mocked(prisma.savingsGoal.findUnique).mockResolvedValue({
      id: goalId,
      groupId: GROUP_ID,
    } as any);
    vi.mocked(prisma.groupMember.findUnique).mockResolvedValue({
      id: "550e8400-e29b-41d4-a716-446655440006",
      userId: "user-1",
      groupId: GROUP_ID,
    } as any);
    vi.mocked(prisma.savingsGoal.delete).mockResolvedValue({
      id: goalId,
      groupId: GROUP_ID,
    } as any);

    await SavingsService.deleteGoal(goalId, "user-1");

    expect(prisma.savingsGoal.delete).toHaveBeenCalledWith({
      where: { id: goalId },
    });
  });
});
