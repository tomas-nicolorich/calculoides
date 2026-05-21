/* eslint-disable @typescript-eslint/unbound-method */
import { describe, it, expect, vi, beforeEach } from "vitest";
import transactionsHandler from "../../transactions";
import { prisma } from "../../src/utils/prisma";
import { getUserFromSession } from "../../src/services/auth";
import { SavingsGoal, Prisma } from "@prisma/client";
import { User } from "@supabase/supabase-js";
import { ApiRequest, ApiResponse } from "../../src/middleware/handler";

// Mock Prisma
vi.mock("../../src/utils/prisma", () => ({
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
  },
}));

// Mock Auth
vi.mock("../../src/services/auth", () => ({
  getUserFromSession: vi.fn(),
  extractTokenFromHeader: vi.fn(() => "mock-token"),
}));

// Mock GroupService
vi.mock("../../src/services/group", () => ({
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
    it("should correctly serialize startingAmount = 0 (BUG-036)", async () => {
      const goalData = {
        name: "New Car",
        targetAmount: 5000,
        startingAmount: 0,
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

      const res = {
        status: vi.fn().mockReturnThis(),
        json: vi.fn().mockReturnThis(),
        setHeader: vi.fn().mockReturnThis(),
        end: vi.fn().mockReturnThis(),
        headersSent: false,
      } as unknown as ApiResponse;

      vi.mocked(prisma.savingsGoal.create).mockResolvedValue({
        id: "goal-1",
        ...goalData,
        targetAmount: 5000 as unknown as Prisma.Decimal,
        startingAmount: 0 as unknown as Prisma.Decimal,
        targetDate: new Date(goalData.targetDate),
      } as unknown as SavingsGoal);

      await transactionsHandler(req, res);

      expect(vi.mocked(prisma.savingsGoal.create)).toHaveBeenCalled();
      expect(res.status).toHaveBeenCalledWith(201);

      const responseBody = vi.mocked(res.json).mock.calls[0][0] as {
        startingAmount: number;
      };
      expect(responseBody.startingAmount).toBe(0);
    });

    it("should default startingAmount to 0 if missing (BUG-036)", async () => {
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

      const res = {
        status: vi.fn().mockReturnThis(),
        json: vi.fn().mockReturnThis(),
        setHeader: vi.fn().mockReturnThis(),
        end: vi.fn().mockReturnThis(),
        headersSent: false,
      } as unknown as ApiResponse;

      vi.mocked(prisma.savingsGoal.create).mockResolvedValue({
        id: "goal-1",
        ...goalData,
        startingAmount: 0 as unknown as Prisma.Decimal,
        targetAmount: 5000 as unknown as Prisma.Decimal,
        targetDate: new Date(goalData.targetDate),
      } as unknown as SavingsGoal);

      await transactionsHandler(req, res);

      expect(vi.mocked(prisma.savingsGoal.create)).toHaveBeenCalled();
    });
  });
});
