import { prisma } from "../utils/prisma";

export const TransferService = {
  /**
   * Creates a budget transfer between two members within a category.
   */
  async createTransfer(
    categoryId: string,
    fromMemberId: string,
    toMemberId: string,
    amount: number,
  ) {
    return await prisma.transfer.create({
      data: {
        categoryId,
        fromMemberId,
        toMemberId,
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
   * Retrieves all transfers for a group.
   */
  async listTransfers(groupId: string, limit = 20, offset = 0) {
    const categories = await prisma.category.findMany({
      where: { groupId },
      select: { id: true }
    });
    
    const categoryIds = categories.map(c => c.id);
    
    const [transfers, total] = await Promise.all([
      prisma.transfer.findMany({
        where: { categoryId: { in: categoryIds } },
        include: {
          category: { select: { name: true } },
          fromMember: { include: { member: { include: { user: { select: { name: true, email: true } } } } } },
          toMember: { include: { member: { include: { user: { select: { name: true, email: true } } } } } }
        },
        orderBy: { date: "desc" },
        take: limit,
        skip: offset
      }),
      prisma.transfer.count({
        where: { categoryId: { in: categoryIds } }
      })
    ]);
    
    return {
      transfers: transfers.map(t => ({
        id: t.id,
        categoryName: t.category.name,
        fromMemberName: t.fromMember.member.user.name ?? t.fromMember.member.user.email,
        toMemberName: t.toMember.member.user.name ?? t.toMember.member.user.email,
        amount: Number(t.amount),
        date: t.date
      })),
      total
    };
  },
};
