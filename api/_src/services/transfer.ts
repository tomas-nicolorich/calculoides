import { prisma } from "../utils/prisma";
import { Prisma } from "@prisma/client";

export const TransferService = {
  /**
   * Creates a budget transfer between two members within a category.
   *
   * `fromMemberId` and `toMemberId` are group member ids. They are resolved to
   * the corresponding `category_members` rows (which the Transfer foreign keys
   * reference) before insertion.
   *
   * For restricted categories both members must already be in the member list.
   * For unrestricted categories (no memberLinks) any group member is allowed;
   * category_member rows are upserted for all group members on first transfer
   * so that the FK constraint is satisfied and balances stay consistent.
   */
  async createTransfer(
    categoryId: string,
    fromMemberId: string,
    toMemberId: string,
    amount: number,
  ) {
    let [fromCategoryMember, toCategoryMember] = await Promise.all([
      prisma.categoryMember.findUnique({
        where: { categoryId_memberId: { categoryId, memberId: fromMemberId } },
        select: { id: true },
      }),
      prisma.categoryMember.findUnique({
        where: { categoryId_memberId: { categoryId, memberId: toMemberId } },
        select: { id: true },
      }),
    ]);

    if (!fromCategoryMember || !toCategoryMember) {
      const category = await prisma.category.findUnique({
        where: { id: categoryId },
        select: {
          groupId: true,
          memberLinks: { select: { memberId: true } },
        },
      });

      if (!category) throw new Error("Category not found.");

      const restrictedIds = category.memberLinks.map((ml) => ml.memberId);

      if (restrictedIds.length > 0) {
        if (
          !restrictedIds.includes(fromMemberId) ||
          !restrictedIds.includes(toMemberId)
        ) {
          throw new Error(
            "Both members must be assigned to this category to transfer budget.",
          );
        }
      } else {
        // Unrestricted category — verify both members belong to the group
        const matchedMembers = await prisma.groupMember.findMany({
          where: {
            groupId: category.groupId,
            id: { in: [fromMemberId, toMemberId] },
          },
          select: { id: true },
        });
        if (matchedMembers.length !== 2) {
          throw new Error(
            "Both members must be assigned to this category to transfer budget.",
          );
        }

        // Upsert category_member rows for ALL group members so that
        // (a) the Transfer FK constraint is satisfied and
        // (b) balance calculation remains consistent for every member.
        const allGroupMembers = await prisma.groupMember.findMany({
          where: { groupId: category.groupId },
          select: { id: true },
        });
        await prisma.categoryMember.createMany({
          data: allGroupMembers.map((m) => ({ categoryId, memberId: m.id })),
          skipDuplicates: true,
        });
      }

      [fromCategoryMember, toCategoryMember] = await Promise.all([
        prisma.categoryMember.findUnique({
          where: { categoryId_memberId: { categoryId, memberId: fromMemberId } },
          select: { id: true },
        }),
        prisma.categoryMember.findUnique({
          where: { categoryId_memberId: { categoryId, memberId: toMemberId } },
          select: { id: true },
        }),
      ]);

      if (!fromCategoryMember || !toCategoryMember) {
        throw new Error("Failed to resolve category members for transfer.");
      }
    }

    return await prisma.transfer.create({
      data: {
        categoryId,
        fromMemberId: fromCategoryMember.id,
        toMemberId: toCategoryMember.id,
        amount,
        date: new Date(),
      },
    });
  },

  async getTransfersForCategory(categoryId: string) {
    return await prisma.transfer.findMany({
      where: { categoryId },
      include: {
        fromMember: {
          include: {
            member: {
              include: {
                user: { select: { name: true, email: true } },
              },
            },
          },
        },
        toMember: {
          include: {
            member: {
              include: {
                user: { select: { name: true, email: true } },
              },
            },
          },
        },
      },
      orderBy: { date: "desc" },
    });
  },

  /**
   * Retrieves all transfers for a group with optional filtering.
   */
  async listTransfers(
    groupId: string,
    categoryId?: string,
    memberId?: string,
    limit = 20,
    offset = 0,
  ) {
    const categories = await prisma.category.findMany({
      where: { groupId },
      select: { id: true },
    });

    const categoryIds = categories.map((c) => c.id);

    const whereClause: Prisma.TransferWhereInput = {
      categoryId: { in: categoryIds },
    };

    if (categoryId) {
      whereClause.categoryId = categoryId;
    }

    if (memberId) {
      whereClause.OR = [
        { fromMember: { memberId } },
        { toMember: { memberId } },
      ];
    }

    const [transfers, total] = await Promise.all([
      prisma.transfer.findMany({
        where: whereClause,
        include: {
          category: { select: { name: true } },
          fromMember: {
            include: {
              member: {
                include: { user: { select: { name: true, email: true } } },
              },
            },
          },
          toMember: {
            include: {
              member: {
                include: { user: { select: { name: true, email: true } } },
              },
            },
          },
        },
        orderBy: { date: "desc" },
        take: limit,
        skip: offset,
      }),
      prisma.transfer.count({
        where: whereClause,
      }),
    ]);

    return {
      transfers: transfers.map((t) => ({
        id: t.id,
        categoryName: t.category.name,
        fromMemberName:
          t.fromMember.member.user.name ?? t.fromMember.member.user.email,
        toMemberName:
          t.toMember.member.user.name ?? t.toMember.member.user.email,
        amount: Number(t.amount),
        date: t.date,
      })),
      total,
    };
  },
};
