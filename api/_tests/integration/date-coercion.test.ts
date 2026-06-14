/* eslint-disable @typescript-eslint/unbound-method */
import { describe, it, expect, vi, beforeEach } from "vitest";
import transactionsHandler from "../../transactions";
import { prisma } from "../../_src/utils/prisma";
import { getUserFromSession } from "../../_src/services/auth";
import { User } from "@supabase/supabase-js";
import { Prisma } from "@prisma/client";
import { ApiRequest } from "../../_src/middleware/handler";
import { createMockResponse } from "../helpers";

// Mock Prisma
vi.mock("../../_src/utils/prisma", () => ({
  prisma: {
    expense: {
      create: vi.fn(),
    },
    groupMember: {
      findFirst: vi.fn().mockResolvedValue({ id: "member-1" }),
      findUnique: vi.fn(),
    },
    category: {
      findUnique: vi.fn().mockResolvedValue({ groupId: "group-1" }),
    },
  },
}));

// Mock Auth
vi.mock("../../_src/services/auth", () => ({
  getUserFromSession: vi.fn(),
  extractTokenFromHeader: vi.fn(() => "mock-token"),
}));

describe("API Date Coercion (BUG-012)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(getUserFromSession).mockResolvedValue({
      id: "user-1",
    } as unknown as User);
  });

  it("should coerce ISO string date in expense creation", async () => {
    const isoDate = "2026-05-15T12:00:00.000Z";
    const req = {
      method: "POST",
      headers: { authorization: "Bearer mock-token" },
      body: {
        categoryId: "550e8400-e29b-41d4-a716-446655440000", // Valid UUID
        description: "Test Expense",
        amount: 10,
        date: isoDate,
      },
      query: { action: "expense-create" },
    } as unknown as ApiRequest;

    const res = createMockResponse();

    vi.mocked(prisma.expense.create).mockResolvedValue({
      id: "exp-1",
    } as unknown as Prisma.ExpenseGetPayload<Record<string, never>>);

    // Vercel handlers are wrapped with withErrorHandling and withAuth
    await transactionsHandler(req, res);

    expect(vi.mocked(prisma.expense.create)).toHaveBeenCalled();
    const responseBody = vi.mocked(res.json).mock.calls[0][0] as Record<
      string,
      unknown
    >;
    expect(responseBody).toBeDefined();
    expect(res.status).toHaveBeenCalledWith(201);
  });
});
