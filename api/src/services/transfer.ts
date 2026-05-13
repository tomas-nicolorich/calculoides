import { prisma } from '../utils/prisma';

export class TransferService {
  /**
   * Creates a budget transfer between two members within a category.
   */
  static async createTransfer(
    categoryId: string,
    fromMemberId: string,
    toMemberId: string,
    amount: number
  ) {
    return await prisma.transfers.create({
      data: {
        categoryId,
        fromMemberId,
        toMemberId,
        amount,
        date: new Date(),
      },
    });
  }

  /**
   * Retrieves all transfers for a category.
   */
  static async getTransfersForCategory(categoryId: string) {
    return await prisma.transfers.findMany({
      where: { categoryId },
      orderBy: { date: 'desc' },
    });
  }
}
