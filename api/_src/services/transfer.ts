import { prisma } from "../utils/prisma";
import { Prisma } from "@prisma/client";

export const TransferService = {
  /**
   * Creates a budget transfer between two members within a category.
   *
   * `fromMemberId` and `toMemberId` are group member ids. They are resolved to
   * the corresponding `category_members` rows (which the Transfer foreign keys
   * reference) before insertion. Both members must already belong to the
   * category.
   */
  async createTransfer(
    categoryId: string,
    fromMemberId: string,
    toMemberId: string,
    amount: number,
  ) {
    const [fromCategoryMember, toCategoryMember] = await Promise.all([
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
      throw new Error(
        "Both members must be assigned to this category to transfer budget.",
      );
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
