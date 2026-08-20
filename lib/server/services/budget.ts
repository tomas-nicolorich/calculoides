import { prisma } from "../../prisma";
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

      // Empty-category signal (#130): no eligible member has income > 0, so no
      // allocation was computed — the frontend renders an empty state.
      const isEmpty = !relevantMembers.some((m) => m.income > 0);

      // Only plain objects can cross the RSC boundary — `category.expenses`/
      // `category.transfers`/`category.memberLinks` carry live Prisma
      // `Decimal` amounts and are omitted here (unused downstream;
      // `balances`/`totalSpent` are already the derived numeric figures
      // consumers need), and `monthlyBudget` is coerced to `Number` instead
      // of spread raw.
      return {
        id: category.id,
        groupId: category.groupId,
        name: category.name,
        icon: category.icon,
        monthlyBudget: Number(category.monthlyBudget),
        createdAt: category.createdAt,
        updatedAt: category.updatedAt,
        balances: enrichedBalances,
        isEmpty,
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
    callerUserId: string,
    icon?: string,
    memberIds?: string[],
  ): Promise<Category> {
    const existing = await prisma.category.findUnique({
      where: { id: categoryId },
      select: { groupId: true },
    });
    if (!existing) throw new Error("Category not found");

    const membership = await prisma.groupMember.findFirst({
      where: { groupId: existing.groupId, userId: callerUserId },
      select: { id: true },
    });
    if (!membership) throw new Error("Not a member of this group");

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

  /**
   * Resolves a category by id (no authorization) — used by callers that
   * need the category's own `groupId` to derive an ownership/membership
   * decision or a cache-revalidation path (4b.2, 4b.7), same
   * resource-resolution role `GroupService.getMemberById` plays for members.
   */
  async getCategoryById(categoryId: string): Promise<Category | null> {
    return await prisma.category.findUnique({ where: { id: categoryId } });
  },

  /**
   * Deletes a category (no authorization of its own). The owner-only check
   * (resource-authorization: "Category Deletion Requires Ownership") lives
   * in `lib/actions/category.ts`'s `deleteCategory` action, resolved via
   * {@link getCategoryById} — same "thin service, action-layer check"
   * precedent as `GroupService.removeMember` (3b.5).
   */
  async deleteCategory(categoryId: string): Promise<void> {
    await prisma.category.delete({ where: { id: categoryId } });
  },
};
