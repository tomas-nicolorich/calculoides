import { prisma } from '../utils/prisma';
import { calculateCategoryBalances } from './calculation';

export interface CategoryBalance {
  memberId: string;
  totalQuota: number;
  spent: number;
  remainingQuota: number;
}

export class BudgetService {
  /**
   * Retrieves a category with its calculated member balances.
   */
  static async getCategoryWithBalances(categoryId: string, members: { id: string; share: number }[]) {
    const category = await prisma.categories.findUnique({
      where: { id: categoryId },
      include: {
        expenses: {
          where: { isArchived: false },
        },
        transfers: true,
      },
    });

    if (!category) return null;

    const balances = calculateCategoryBalances(
      { monthlyBudget: Number(category.monthlyBudget) },
      members,
      category.expenses.map((e) => ({ payerId: e.payerId, amount: Number(e.amount) })),
      category.transfers.map((t) => ({
        fromMemberId: t.fromMemberId,
        toMemberId: t.toMemberId,
        amount: Number(t.amount),
      }))
    );

    return {
      ...category,
      balances,
    };
  }

  static async createCategory(groupId: string, name: string, monthlyBudget: number, icon?: string) {
    return await prisma.categories.create({
      data: {
        groupId,
        name,
        monthlyBudget,
        icon,
        updatedAt: new Date(),
      },
    });
  }
}
