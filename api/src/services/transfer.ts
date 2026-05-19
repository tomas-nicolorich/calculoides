import { prisma } from '../utils/prisma';

export const TransferService = {
  /**
   * Creates a budget transfer between two members within a category.
   */
  async createTransfer(
    categoryId: string,
    fromMemberId: string,
    toMemberId: string,
    amount: number
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

  /**
   * Retrieves all transfers for a category.
   * Mandated by BUG-014 to include fromMember and toMember user names.
   */
  async getTransfersForCategory(categoryId: string) {
    return await prisma.transfer.findMany({
      where: { categoryId },
      include: {
        fromMember: {
          include: {
            user: { select: { name: true, email: true } },
          },
        },
        toMember: {
          include: {
            user: { select: { name: true, email: true } },
          },
        },
      },
      orderBy: { date: 'desc' },
    });
  }
};
