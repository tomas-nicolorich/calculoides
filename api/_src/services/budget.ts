import { prisma } from "../utils/prisma";
import { Category } from "@prisma/client";
import {
  calculateCategoryBalances,
  calculateIncomeShares,
  resolveRelevantShares,
} from "./calculation";

export const BudgetService = {
  /**
   * Retrieves all categories for a group with calculated member balances.
   * Mandated by BUG-019.
   */
  async listCategoriesWithBalances(groupId: string) {
    // 1. Fetch group members with user details
    const members = await prisma.groupMember.findMany({
      where: { groupId },
      include: {
        user: {
          select: { name: true, email: true },
        },
      },
    });

    const incomeShares = calculateIncomeShares(
      members.map((m) => ({ id: m.id, income: Number(m.income) })),
    );

    // 2. Fetch all categories for the group
    const categories = await prisma.category.findMany({
      where: { groupId },
      orderBy: { monthlyBudget: "desc" },
      include: {
        expenses: {
          where: { isArchived: false },
        },
        transfers: {
          include: {
            fromMember: { select: { memberId: true } },
            toMember: { select: { memberId: true } },
          },
        },
        memberLinks: {
          select: { memberId: true },
        },
      },
    });

    // 3. Calculate balances for each category
    return categories.map((category) => {
      // BUG-029: Recalculate income shares if category is restricted to a subset of members
      const relevantShares = resolveRelevantShares(
        members.map((m) => ({ id: m.id, income: Number(m.income) })),
        category.memberLinks,
        incomeShares,
      );

      // Quota + percentage derive from PRECISE income weights over the eligible
      // subset (restricted categories renormalize over their linked members).
      const relevantMembers =
        category.memberLinks.length === 0
          ? members.map((m) => ({ id: m.id, income: Number(m.income) }))
          : members
              .filter((m) =>
                category.memberLinks.some((ml) => ml.memberId === m.id),
              )
              .map((m) => ({ id: m.id, income: Number(m.income) }));

      const balances = calculateCategoryBalances(
        { monthlyBudget: Number(category.monthlyBudget) },
        relevantMembers,
        category.expenses.map((e) => ({
          payerId: e.payerId,
          amount: Number(e.amount),
        })),
        category.transfers.map((t) => ({
          fromMemberId: t.fromMember.memberId,
          toMemberId: t.toMember.memberId,
          amount: Number(t.amount),
        })),
      );

      // Join member user info into balances
      const enrichedBalances = balances.map((b) => {
        const member = members.find((m) => m.id === b.memberId);
        const shareData = relevantShares.find((rs) => rs.id === b.memberId);
        return {
          ...b,
          user: member?.user,
          // money share (0..1) kept for any consumers; percentage is the
          // canonical 1dp display value, computed alongside the quota.
          share: shareData?.share ?? 0,
          percentage: b.percentage,
        };
      });

      return {
        ...category,
        balances: enrichedBalances,
        totalSpent: enrichedBalances.reduce((acc, b) => acc + b.spent, 0),
      };
    });
  },

  async createCategory(
    groupId: string,
    name: string,
    monthlyBudget: number,
    icon?: string,
    memberIds?: string[],
  ) {
    return await prisma.$transaction(async (tx) => {
      const category = await tx.category.create({
        data: {
          groupId,
          name,
          monthlyBudget,
          icon,
          updatedAt: new Date(),
        },
      });

      if (memberIds && memberIds.length > 0) {
        await tx.categoryMember.createMany({
          data: memberIds.map((memberId) => ({
            categoryId: category.id,
            memberId,
          })),
        });
      }

      return category;
    });
  },

  async updateCategory(
    categoryId: string,
    name: string,
    monthlyBudget: number,
    icon?: string,
    memberIds?: string[],
  ): Promise<Category> {
    return await prisma.$transaction(async (tx) => {
      const category = await tx.category.update({
        where: { id: categoryId },
        data: {
          name,
          monthlyBudget,
          icon,
          updatedAt: new Date(),
        },
      });

      await tx.categoryMember.deleteMany({
        where: { categoryId },
      });

      if (memberIds && memberIds.length > 0) {
        await tx.categoryMember.createMany({
          data: memberIds.map((memberId) => ({
            categoryId,
            memberId,
          })),
        });
      }

      return category;
    });
  },

  async listCategories(groupId: string) {
    return await prisma.category.findMany({
      where: { groupId },
      include: {
        expenses: {
          where: { isArchived: false },
        },
        transfers: true,
      },
    });
  },
};
