/* eslint-disable @typescript-eslint/unbound-method */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
import { describe, it, expect, vi, beforeEach } from "vitest";
import { BudgetService } from "../../../lib/server/services/budget";
import { TransferService } from "../../../lib/server/services/transfer";
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
      findUnique: vi.fn(),
    },
    categoryMember: {
      deleteMany: vi.fn(),
      createMany: vi.fn(),
    },
    groupMember: {
      findFirst: vi.fn(),
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
      vi.mocked(prisma.category.findUnique).mockResolvedValue({
        groupId: "group-123",
      } as unknown as Category);
      vi.mocked(prisma.groupMember.findFirst).mockResolvedValue({
        id: "member-1",
      } as unknown as Prisma.GroupMemberGetPayload<Record<string, never>>);

      const result = await BudgetService.updateCategory(
        categoryId,
        updatedData.name,
        updatedData.monthlyBudget,
        "user-123",
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

    it("should select category id and icon and map them onto each transfer", async () => {
      const groupId = "group-123";
      const categoryId = "cat-123";

      vi.mocked(prisma.category.findMany).mockResolvedValue([
        { id: categoryId },
      ] as unknown as Category[]);

      vi.mocked(prisma.transfer.findMany).mockResolvedValue([
        {
          id: "transfer-1",
          category: { id: categoryId, name: "Groceries", icon: "🍎" },
          fromMember: {
            member: { user: { name: "Alice", email: "alice@example.com" } },
          },
          toMember: {
            member: { user: { name: "Bob", email: "bob@example.com" } },
          },
          amount: 100,
          date: new Date("2026-01-01"),
        },
      ] as unknown as Transfer[]);
      vi.mocked(prisma.transfer.count).mockResolvedValue(1);

      const { transfers } = await TransferService.listTransfers(groupId);

      expect(prisma.transfer.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          include: expect.objectContaining({
            category: { select: { id: true, name: true, icon: true } },
          }),
        }),
      );

      expect(transfers[0]).toEqual(
        expect.objectContaining({
          categoryId,
          categoryName: "Groceries",
          categoryIcon: "🍎",
        }),
      );
    });
  });
});
