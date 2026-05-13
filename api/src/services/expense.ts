import { prisma } from '../utils/prisma';

export class ExpenseService {
  /**
   * Logs a new expense.
   */
  static async logExpense(
    categoryId: string,
    payerId: string,
    description: string,
    amount: number,
    date: Date = new Date()
  ) {
    return await prisma.expenses.create({
      data: {
        categoryId,
        payerId,
        description,
        amount,
        date,
      },
    });
  }

  /**
   * Retrieves expenses for a category.
   */
  static async getExpensesByCategory(categoryId: string) {
    return await prisma.expenses.findMany({
      where: {
        categoryId,
        isArchived: false,
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
    return await prisma.expenses.delete({
      where: { id: expenseId },
    });
  }

  /**
   * Archives all expenses in a group (for end-of-month reset).
   */
  static async archiveGroupExpenses(groupId: string) {
    // Find all categories in the group
    const categories = await prisma.categories.findMany({
      where: { groupId },
      select: { id: true },
    });

    return await prisma.expenses.updateMany({
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
