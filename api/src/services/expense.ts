import { prisma } from '../utils/prisma';

export class ExpenseService {
  /**
   * Logs a new expense.
   * Mandated by BUG-015 to resolve GroupMember ID from User ID and Category's Group.
   */
  static async logExpense(
    categoryId: string,
    payerIdOrUserId: string,
    description: string,
    amount: number,
    date: Date = new Date()
  ) {
    // Check if payerIdOrUserId is already a GroupMember ID or a User ID
    // We first try to find the category to get the groupId
    const category = await prisma.category.findUnique({
      where: { id: categoryId },
      select: { groupId: true },
    });

    if (!category) throw new Error('Category not found');

    // Resolve the GroupMember ID
    let finalPayerId = payerIdOrUserId;

    // Try to find if payerIdOrUserId is a userId in this group
    const membership = await prisma.groupMember.findFirst({
      where: {
        groupId: category.groupId,
        OR: [
          { id: payerIdOrUserId },
          { userId: payerIdOrUserId }
        ]
      },
      select: { id: true }
    });

    if (!membership) {
      throw new Error('Payer is not a member of this group');
    }

    finalPayerId = membership.id;

    return await prisma.expense.create({
      data: {
        categoryId,
        payerId: finalPayerId,
        description,
        amount,
        date,
      },
    });
  }

  /**
   * Retrieves expenses for a category.
   * Mandated by BUG-014 to include payer user names.
   */
  static async getExpensesByCategory(categoryId: string) {
    return await prisma.expense.findMany({
      where: {
        categoryId,
        isArchived: false,
      },
      include: {
        payer: {
          include: {
            user: {
              select: { name: true, email: true },
            },
          },
        },
      },
      orderBy: {
        date: 'desc',
      },
    });
  }

  /**
   * Deletes an expense (Permanent deletion per specification).
   */
  static async deleteExpense(expenseId: string) {
    return await prisma.expense.delete({
      where: { id: expenseId },
    });
  }

  /**
   * Archives all expenses in a group (for end-of-month reset).
   */
  static async archiveGroupExpenses(groupId: string) {
    // Find all categories in the group
    const categories = await prisma.category.findMany({
      where: { groupId },
      select: { id: true },
    });

    return await prisma.expense.updateMany({
      where: {
        categoryId: { in: categories.map((c) => c.id) },
        isArchived: false,
      },
      data: {
        isArchived: true,
      },
    });
  }
}
