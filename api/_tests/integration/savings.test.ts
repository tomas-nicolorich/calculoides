/* eslint-disable @typescript-eslint/unbound-method */
import { describe, it, expect, vi, beforeEach } from "vitest";
import transactionsHandler from "../../transactions";
import { prisma } from "../../_src/utils/prisma";
import { getUserFromSession } from "../../_src/services/auth";
import { GroupService } from "../../_src/services/group";
import { SavingsGoal, Prisma } from "@prisma/client";
import { User } from "@supabase/supabase-js";
import { ApiRequest } from "../../_src/middleware/handler";
import { createMockResponse } from "../helpers";

// Mock Prisma
vi.mock("../../_src/utils/prisma", () => ({
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

// Mock Auth
vi.mock("../../_src/services/auth", () => ({
  getUserFromSession: vi.fn(),
  extractTokenFromHeader: vi.fn(() => "mock-token"),
}));

// Mock GroupService
vi.mock("../../_src/services/group", () => ({
  GroupService: {
    getGroupsForUser: vi.fn(),
  },
}));

describe("Savings API Integration", () => {
  const GROUP_ID = "550e8400-e29b-41d4-a716-446655440001";

  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(getUserFromSession).mockResolvedValue({
      id: "user-1",
    } as unknown as User);
    // Caller is a member of GROUP_ID by default — individual tests override
    // this where they need to exercise the not-a-member path.
    vi.mocked(GroupService.getGroupsForUser).mockResolvedValue([
      { id: GROUP_ID },
    ] as unknown as Awaited<ReturnType<typeof GroupService.getGroupsForUser>>);
    vi.mocked(prisma.groupMember.findFirst).mockResolvedValue({
      id: "member-caller",
    } as unknown as Awaited<ReturnType<typeof prisma.groupMember.findFirst>>);
  });

  describe("POST /api/savings", () => {
    it("should correctly serialize currentAmount = 0 (BUG-036)", async () => {
      const goalData = {
        name: "New Car",
        targetAmount: 5000,
        currentAmount: 0,
        targetDate: "2027-01-01",
      };

      const req = {
        method: "POST",
        headers: { authorization: "Bearer mock-token" },
        query: {
          groupId: "550e8400-e29b-41d4-a716-446655440001",
          action: "savings-goal-create",
        },
        body: goalData,
      } as unknown as ApiRequest;

      const res = createMockResponse();

      vi.mocked(prisma.savingsGoal.create).mockResolvedValue({
        id: "goal-1",
        ...goalData,
        targetAmount: 5000 as unknown as Prisma.Decimal,
        currentAmount: 0 as unknown as Prisma.Decimal,
        targetDate: new Date(goalData.targetDate),
      } as unknown as SavingsGoal);

      await transactionsHandler(req, res);

      expect(vi.mocked(prisma.savingsGoal.create)).toHaveBeenCalled();
      expect(res.status).toHaveBeenCalledWith(201);

      const responseBody = vi.mocked(res.json).mock.calls[0][0] as {
        currentAmount: number;
      };
      expect(responseBody.currentAmount).toBe(0);
    });

    it("should default currentAmount to 0 if missing (BUG-036)", async () => {
      const goalData = {
        name: "New Car",
        targetAmount: 5000,
        targetDate: "2027-01-01",
      };

      const req = {
        method: "POST",
        headers: { authorization: "Bearer mock-token" },
        query: {
          groupId: "550e8400-e29b-41d4-a716-446655440001",
          action: "savings-goal-create",
        },
        body: goalData,
      } as unknown as ApiRequest;

      const res = createMockResponse();

      vi.mocked(prisma.savingsGoal.create).mockResolvedValue({
        id: "goal-1",
        ...goalData,
        currentAmount: 0 as unknown as Prisma.Decimal,
        targetAmount: 5000 as unknown as Prisma.Decimal,
        targetDate: new Date(goalData.targetDate),
      } as unknown as SavingsGoal);

      await transactionsHandler(req, res);

      expect(vi.mocked(prisma.savingsGoal.create)).toHaveBeenCalled();
    });
  });

  describe("GET /api/savings (savings-goals-list)", () => {
    const groupId = "550e8400-e29b-41d4-a716-446655440001";

    function mockGroupData(
      contributions: { memberId: string; customAmount: number }[],
    ) {
      const targetDate = new Date();
      targetDate.setMonth(targetDate.getMonth() + 5);

      vi.mocked(prisma.groupMember.findMany).mockResolvedValue([
        {
          id: "m1",
          income: 600 as unknown as Prisma.Decimal,
          user: { name: "Alice", email: "alice@x.com" },
        },
        {
          id: "m2",
          income: 400 as unknown as Prisma.Decimal,
          user: { name: "Bob", email: "bob@x.com" },
        },
      ] as unknown as Awaited<ReturnType<typeof prisma.groupMember.findMany>>);

      vi.mocked(prisma.savingsGoal.findMany).mockResolvedValue([
        {
          id: "goal-1",
          groupId,
          name: "Car",
          icon: null,
          targetAmount: 1200 as unknown as Prisma.Decimal,
          currentAmount: 200 as unknown as Prisma.Decimal,
          targetDate,
          contributions: contributions.map((c) => ({
            goalId: "goal-1",
            memberId: c.memberId,
            customAmount: c.customAmount as unknown as Prisma.Decimal,
          })),
        },
      ] as unknown as Awaited<ReturnType<typeof prisma.savingsGoal.findMany>>);

      vi.mocked(prisma.category.findMany).mockResolvedValue([
        {
          id: "cat-1",
          monthlyBudget: 100 as unknown as Prisma.Decimal,
          memberLinks: [],
        },
      ] as unknown as Awaited<ReturnType<typeof prisma.category.findMany>>);

      vi.mocked(prisma.expense.findMany).mockResolvedValue([]);
      vi.mocked(prisma.transfer.findMany).mockResolvedValue([]);
    }

    function buildRequest(): ApiRequest {
      return {
        method: "GET",
        headers: { authorization: "Bearer mock-token" },
        query: { groupId, action: "savings-goals-list" },
      } as unknown as ApiRequest;
    }

    it("attaches breakdown[].remainingBalance = income - budgeted per member", async () => {
      mockGroupData([]);

      const res = createMockResponse();
      await transactionsHandler(buildRequest(), res);

      const body = vi.mocked(res.json).mock.calls[0][0] as {
        breakdown: {
          memberId: string;
          remainingBalance: number;
        }[];
      }[];

      const breakdown = body[0].breakdown;
      const alice = breakdown.find((b) => b.memberId === "m1");
      const bob = breakdown.find((b) => b.memberId === "m2");

      // income 600, category budget 100 unrestricted -> quota 60 -> ceiling 540
      expect(alice?.remainingBalance).toBe(540);
      // income 400, category budget 100 unrestricted -> quota 40 -> ceiling 360
      expect(bob?.remainingBalance).toBe(360);
    });

    it("leaves proportionalAmount/actualAmount allocation values unchanged by the new remainingBalance field", async () => {
      mockGroupData([{ memberId: "m2", customAmount: 999 }]);

      const res = createMockResponse();
      await transactionsHandler(buildRequest(), res);

      const body = vi.mocked(res.json).mock.calls[0][0] as {
        breakdown: {
          memberId: string;
          proportionalAmount: number;
          actualAmount: number;
          isOverridden: boolean;
          remainingBalance: number;
        }[];
      }[];

      const breakdown = body[0].breakdown;
      const alice = breakdown.find((b) => b.memberId === "m1");
      const bob = breakdown.find((b) => b.memberId === "m2");

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

      const res = createMockResponse();
      await transactionsHandler(buildRequest(), res);

      const body = vi.mocked(res.json).mock.calls[0][0] as {
        varianceMonths: number;
      }[];

      expect(body[0].varianceMonths).toBe(0);
    });
  });

  describe("DELETE /api/savings/contribution (savings-contribution-delete) — issue #161", () => {
    const goalId = "550e8400-e29b-41d4-a716-446655440005";
    const memberId = "550e8400-e29b-41d4-a716-446655440006";
    const groupId = "550e8400-e29b-41d4-a716-446655440001";

    it("deletes the contribution row, then a subsequent list recomputes actualAmount from live base (no getGoalsForGroup merge-logic change)", async () => {
      vi.mocked(prisma.savingsGoal.findUnique).mockResolvedValue({
        id: goalId,
        groupId,
      } as unknown as SavingsGoal);
      vi.mocked(prisma.groupMember.findUnique).mockResolvedValue({
        id: memberId,
        groupId,
      } as unknown as Awaited<
        ReturnType<typeof prisma.groupMember.findUnique>
      >);
      vi.mocked(prisma.savingsGoalContribution.deleteMany).mockResolvedValue({
        count: 1,
      });

      const deleteReq = {
        method: "DELETE",
        headers: { authorization: "Bearer mock-token" },
        query: { action: "savings-contribution-delete", goalId, memberId },
      } as unknown as ApiRequest;
      const deleteRes = createMockResponse();

      await transactionsHandler(deleteReq, deleteRes);

      expect(
        vi.mocked(prisma.savingsGoalContribution.deleteMany),
      ).toHaveBeenCalledWith({ where: { goalId, memberId } });
      expect(deleteRes.status).toHaveBeenCalledWith(204);

      // Simulate the post-delete DB state: getGoalsForGroup's own findMany
      // now returns no contribution row for this goal/member — the merge
      // logic in SavingsService.getGoalsForGroup is untouched (design:
      // "Backend getGoalsForGroup merge is unchanged — removing a row
      // makes it recompute base").
      const targetDate = new Date();
      targetDate.setMonth(targetDate.getMonth() + 5);

      vi.mocked(prisma.groupMember.findMany).mockResolvedValue([
        {
          id: memberId,
          income: 1000 as unknown as Prisma.Decimal,
          user: { name: "Dave", email: "dave@x.com" },
        },
      ] as unknown as Awaited<ReturnType<typeof prisma.groupMember.findMany>>);

      vi.mocked(prisma.savingsGoal.findMany).mockResolvedValue([
        {
          id: goalId,
          groupId,
          name: "Trip",
          icon: null,
          targetAmount: 1200 as unknown as Prisma.Decimal,
          currentAmount: 200 as unknown as Prisma.Decimal,
          targetDate,
          contributions: [], // row was deleted — no override remains
        },
      ] as unknown as Awaited<ReturnType<typeof prisma.savingsGoal.findMany>>);

      vi.mocked(prisma.category.findMany).mockResolvedValue([]);
      vi.mocked(prisma.expense.findMany).mockResolvedValue([]);
      vi.mocked(prisma.transfer.findMany).mockResolvedValue([]);

      const listReq = {
        method: "GET",
        headers: { authorization: "Bearer mock-token" },
        query: { groupId, action: "savings-goals-list" },
      } as unknown as ApiRequest;
      const listRes = createMockResponse();

      await transactionsHandler(listReq, listRes);

      const body = vi.mocked(listRes.json).mock.calls[0][0] as {
        breakdown: {
          memberId: string;
          proportionalAmount: number;
          actualAmount: number;
          isOverridden: boolean;
        }[];
      }[];

      const member = body[0].breakdown.find((b) => b.memberId === memberId);
      expect(member?.isOverridden).toBe(false);
      expect(member?.actualAmount).toBe(member?.proportionalAmount);
    });
  });

  describe("DELETE /api/savings (savings-goal-delete) — IDOR", () => {
    const goalId = "550e8400-e29b-41d4-a716-446655440005";
    const groupId = "550e8400-e29b-41d4-a716-446655440001";

    it("rejects deleting a goal when the requesting user is not a member of the goal's group", async () => {
      vi.mocked(prisma.savingsGoal.findUnique).mockResolvedValue({
        id: goalId,
        groupId,
      } as unknown as SavingsGoal);
      vi.mocked(prisma.groupMember.findUnique).mockResolvedValue(null);

      const req = {
        method: "DELETE",
        headers: { authorization: "Bearer mock-token" },
        query: { action: "savings-goal-delete", goalId },
      } as unknown as ApiRequest;
      const res = createMockResponse();

      await transactionsHandler(req, res);

      expect(prisma.savingsGoal.delete).not.toHaveBeenCalled();
      expect(res.status).not.toHaveBeenCalledWith(204);
    });

    it("deletes the goal when the requesting user belongs to the goal's group", async () => {
      vi.mocked(prisma.savingsGoal.findUnique).mockResolvedValue({
        id: goalId,
        groupId,
      } as unknown as SavingsGoal);
      vi.mocked(prisma.groupMember.findUnique).mockResolvedValue({
        id: "550e8400-e29b-41d4-a716-446655440006",
        userId: "user-1",
        groupId,
      } as unknown as Awaited<
        ReturnType<typeof prisma.groupMember.findUnique>
      >);
      vi.mocked(prisma.savingsGoal.delete).mockResolvedValue({
        id: goalId,
        groupId,
      } as unknown as SavingsGoal);

      const req = {
        method: "DELETE",
        headers: { authorization: "Bearer mock-token" },
        query: { action: "savings-goal-delete", goalId },
      } as unknown as ApiRequest;
      const res = createMockResponse();

      await transactionsHandler(req, res);

      expect(prisma.savingsGoal.delete).toHaveBeenCalledWith({
        where: { id: goalId },
      });
      expect(res.status).toHaveBeenCalledWith(204);
    });
  });
});
