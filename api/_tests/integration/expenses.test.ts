/* eslint-disable @typescript-eslint/unbound-method */
import { describe, it, expect, vi, beforeEach } from "vitest";
import { ExpenseService } from "../../_src/services/expense";
import { prisma } from "../../_src/utils/prisma";
import { Category, GroupMember, Expense } from "@prisma/client";

// Mock Prisma
vi.mock("../../_src/utils/prisma", () => ({
  prisma: {
    expense: {
      create: vi.fn(),
      findMany: vi.fn(),
      findUnique: vi.fn(),
      delete: vi.fn(),
      updateMany: vi.fn(),
      count: vi.fn(),
    },
    category: {
      findMany: vi.fn(),
      findUnique: vi.fn(),
    },
    groupMember: {
      findFirst: vi.fn(),
    },
    $transaction: vi.fn(),
  },
}));

describe("ExpenseService Integration", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should log a new expense correctly with ISO date string", async () => {
    const expenseData = {
      categoryId: "cat-1",
      payerId: "member-1",
      description: "Groceries",
      amount: 50.5,
      date: new Date().toISOString(), // ISO String
    };

    // Mock category resolution
    vi.mocked(prisma.category.findUnique).mockResolvedValue({
      id: "cat-1",
      groupId: "group-1",
    } as unknown as Category);
    // Mock membership resolution
    vi.mocked(prisma.groupMember.findFirst).mockResolvedValue({
      id: "member-1",
    } as unknown as GroupMember);
    // Mock expense creation
    vi.mocked(prisma.expense.create).mockResolvedValue({
      id: "exp-1",
      ...expenseData,
      date: new Date(expenseData.date),
    } as unknown as Expense);

    const result = await ExpenseService.logExpense(
      expenseData.categoryId,
      expenseData.payerId,
      expenseData.description,
      expenseData.amount,
      new Date(expenseData.date),
      "member-1",
    );

    expect(result.id).toBe("exp-1");
  });

  it("should order listExpenses by date desc, then createdAt desc as a tiebreak", async () => {
    vi.mocked(prisma.$transaction).mockImplementation(async (ops: unknown) =>
      Promise.all(ops as Promise<unknown>[]),
    );
    vi.mocked(prisma.expense.findMany).mockResolvedValue([]);
    vi.mocked(prisma.expense.count).mockResolvedValue(0);

    await ExpenseService.listExpenses("group-1");

    expect(vi.mocked(prisma.expense.findMany)).toHaveBeenCalledWith(
      expect.objectContaining({
        orderBy: [{ date: "desc" }, { createdAt: "desc" }],
      }),
    );
  });

  it("should order getExpensesByCategory by date desc, then createdAt desc as a tiebreak", async () => {
    vi.mocked(prisma.expense.findMany).mockResolvedValue([]);

    await ExpenseService.getExpensesByCategory("cat-1");

    expect(vi.mocked(prisma.expense.findMany)).toHaveBeenCalledWith(
      expect.objectContaining({
        orderBy: [{ date: "desc" }, { createdAt: "desc" }],
      }),
    );
  });

  it("should delete an expense permanently", async () => {
    const expenseId = "exp-1";
    vi.mocked(prisma.expense.findUnique).mockResolvedValue({
      id: expenseId,
      category: { groupId: "group-1" },
    } as unknown as Expense);
    vi.mocked(prisma.groupMember.findFirst).mockResolvedValue({
      id: "member-1",
    } as unknown as GroupMember);
    vi.mocked(prisma.expense.delete).mockResolvedValue({
      id: expenseId,
    } as unknown as Expense);

    await ExpenseService.deleteExpense(expenseId, "user-1");

    expect(vi.mocked(prisma.expense.delete)).toHaveBeenCalledWith({
      where: { id: expenseId },
    });
  });
});
