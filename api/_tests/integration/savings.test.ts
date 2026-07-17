/* eslint-disable @typescript-eslint/unbound-method */
import { describe, it, expect, vi, beforeEach } from "vitest";
import transactionsHandler from "../../transactions";
import { prisma } from "../../_src/utils/prisma";
import { getUserFromSession } from "../../_src/services/auth";
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
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(getUserFromSession).mockResolvedValue({
      id: "user-1",
    } as unknown as User);
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
  });
});
