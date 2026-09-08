import { describe, it, expect, vi, beforeEach, Mock } from "vitest";
import { ExpenseService } from "./expense";

// ── Prisma mock ──────────────────────────────────────────────────────────────
vi.mock("../../prisma", () => ({
  prisma: {
    expense: {
      findUnique: vi.fn(),
      update: vi.fn(),
    },
    groupMember: {
      findFirst: vi.fn(),
    },
  },
}));

import { prisma } from "../../prisma";
const mockPrisma = prisma as unknown as {
  expense: { findUnique: Mock; update: Mock };
  groupMember: { findFirst: Mock };
};

const EXPENSE_ID = "550e8400-e29b-41d4-a716-446655440001";
const GROUP_ID = "550e8400-e29b-41d4-a716-446655440002";
const CATEGORY_ID = "550e8400-e29b-41d4-a716-446655440003";
const PAYER_ID = "550e8400-e29b-41d4-a716-446655440004";
const USER_ID = "550e8400-e29b-41d4-a716-446655440005";

const existingExpense = {
  id: EXPENSE_ID,
  categoryId: CATEGORY_ID,
  payerId: PAYER_ID,
  description: "Old",
  amount: 10,
  date: new Date("2024-01-01"),
  category: { groupId: GROUP_ID },
};

describe("ExpenseService.updateExpense", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("updates expense when caller is a group member", async () => {
    mockPrisma.expense.findUnique.mockResolvedValue(existingExpense);
    mockPrisma.groupMember.findFirst.mockResolvedValue({ id: PAYER_ID });
    const updated = { ...existingExpense, description: "New", amount: 99 };
    mockPrisma.expense.update.mockResolvedValue(updated);

    const result = await ExpenseService.updateExpense(
      EXPENSE_ID,
      {
        description: "New",
        amount: 99,
        date: "2024-06-01",
        categoryId: CATEGORY_ID,
        payerId: PAYER_ID,
      },
      USER_ID,
    );

    expect(mockPrisma.expense.update).toHaveBeenCalledWith({
      where: { id: EXPENSE_ID },
      data: {
        description: "New",
        amount: 99,
        date: new Date("2024-06-01"),
        categoryId: CATEGORY_ID,
        payerId: PAYER_ID,
      },
    });
    expect(result).toBe(updated);
  });

  it("throws 404 error when expense not found", async () => {
    mockPrisma.expense.findUnique.mockResolvedValue(null);

    await expect(
      ExpenseService.updateExpense(
        EXPENSE_ID,
        {
          description: "X",
          amount: 1,
          date: "2024-01-01",
          categoryId: CATEGORY_ID,
          payerId: PAYER_ID,
        },
        USER_ID,
      ),
    ).rejects.toThrow("Expense not found");
  });

  it("throws 403 error when caller is not a group member", async () => {
    mockPrisma.expense.findUnique.mockResolvedValue(existingExpense);
    mockPrisma.groupMember.findFirst.mockResolvedValue(null);

    await expect(
      ExpenseService.updateExpense(
        EXPENSE_ID,
        {
          description: "X",
          amount: 1,
          date: "2024-01-01",
          categoryId: CATEGORY_ID,
          payerId: PAYER_ID,
        },
        USER_ID,
      ),
    ).rejects.toThrow("Not a member of this group");
  });
});
