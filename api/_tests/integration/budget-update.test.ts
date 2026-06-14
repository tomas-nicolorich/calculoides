/* eslint-disable @typescript-eslint/unbound-method */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
import { describe, it, expect, vi, beforeEach } from "vitest";
import { BudgetService } from "../../_src/services/budget";
import { TransferService } from "../../_src/services/transfer";
import { prisma } from "../../_src/utils/prisma";
import { Category, Transfer, Prisma } from "@prisma/client";

// Mock Prisma
vi.mock("../../_src/utils/prisma", () => ({
  prisma: {
    $transaction: vi.fn(
      (cb: (tx: Prisma.TransactionClient) => Promise<unknown>) =>
        cb(prisma as unknown as Prisma.TransactionClient),
    ),
    category: {
      update: vi.fn(),
      findMany: vi.fn(),
    },
    categoryMember: {
      deleteMany: vi.fn(),
      createMany: vi.fn(),
    },
    transfer: {
      findMany: vi.fn(),
      count: vi.fn(),
    },
  },
}));

describe("Budget & Transfer Services Extensions", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("BudgetService.updateCategory", () => {
    it("should update category details and recreate member links in transaction", async () => {
      const categoryId = "cat-123";
      const updatedData = {
        id: categoryId,
        name: "Groceries Redesign",
        monthlyBudget: 350.0,
        icon: "🍎",
      };

      vi.mocked(prisma.category.update).mockResolvedValue(
        updatedData as unknown as Category,
      );

      const result = await BudgetService.updateCategory(
        categoryId,
        updatedData.name,
        updatedData.monthlyBudget,
        updatedData.icon,
        ["member-1", "member-2"],
      );

      expect(prisma.category.update).toHaveBeenCalledWith({
        where: { id: categoryId },
        data: expect.objectContaining({
          name: updatedData.name,
          monthlyBudget: updatedData.monthlyBudget,
          icon: updatedData.icon,
        }),
      });

      expect(prisma.categoryMember.deleteMany).toHaveBeenCalledWith({
        where: { categoryId },
      });

      expect(prisma.categoryMember.createMany).toHaveBeenCalledWith({
        data: [
          { categoryId, memberId: "member-1" },
          { categoryId, memberId: "member-2" },
        ],
      });

      expect(result).toEqual(updatedData);
    });
  });

  describe("TransferService.listTransfers", () => {
    it("should build correct prisma query filters when categoryId and memberId are specified", async () => {
      const groupId = "group-123";
      const categoryId = "cat-123";
      const memberId = "member-123";

      // Mock finding group categories
      vi.mocked(prisma.category.findMany).mockResolvedValue([
        { id: categoryId },
        { id: "cat-456" },
      ] as unknown as Category[]);

      // Mock transfers fetch
      vi.mocked(prisma.transfer.findMany).mockResolvedValue([] as Transfer[]);
      vi.mocked(prisma.transfer.count).mockResolvedValue(0);

      await TransferService.listTransfers(groupId, categoryId, memberId, 10, 0);

      expect(prisma.transfer.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            categoryId: categoryId,
            OR: [{ fromMember: { memberId } }, { toMember: { memberId } }],
          }),
        }),
      );
    });
  });
});
