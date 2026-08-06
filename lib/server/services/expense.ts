import { Prisma } from "@prisma/client";
import { prisma } from "../../prisma";

export const ExpenseService = {
  /**
   * Logs a new expense.
   * Mandated by BUG-015 to resolve GroupMember ID from User ID and Category's Group.
   */
  async logExpense(
    categoryId: string,
    payerIdOrUserId: string,
    description: string,
    amount: number,
    date: Date = new Date(),
    callerUserId: string,
  ): Promise<Prisma.ExpenseGetPayload<Record<string, never>>> {
    // Check if payerIdOrUserId is already a GroupMember ID or a User ID
    // We first try to find the category to get the groupId
    const category = await prisma.category.findUnique({
      where: { id: categoryId },
      select: { groupId: true },
    });

    if (!category) throw new Error("Category not found");

    const callerMembership = await prisma.groupMember.findFirst({
      where: { groupId: category.groupId, userId: callerUserId },
      select: { id: true },
    });
    if (!callerMembership) throw new Error("Not a member of this group");

    // Try to find if payerIdOrUserId is a userId in this group
    const membership = await prisma.groupMember.findFirst({
      where: {
        groupId: category.groupId,
        OR: [{ id: payerIdOrUserId }, { userId: payerIdOrUserId }],
      },
      select: { id: true },
    });

    if (!membership) {
      throw new Error("Payer is not a member of this group");
    }

    const finalPayerId = membership.id;

    return await prisma.expense.create({
      data: {
        categoryId,
        payerId: finalPayerId,
        description,
        amount,
        date,
      },
    });
  },

  /**
   * Retrieves expenses for a category.
   * Mandated by BUG-014 to include payer user names.
   */
  async getExpensesByCategory(categoryId: string) {
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
      orderBy: [{ date: "desc" }, { createdAt: "desc" }],
    });
  },

  /**
   * Lists expenses for a group with pagination and optional category filtering.
   */
  async listExpenses(
    groupId: string,
    categoryId?: string,
    memberId?: string,
    limit = 20,
    offset = 0,
    from?: string,
    to?: string,
  ) {
    const where: Prisma.ExpenseWhereInput = {
      category: {
        groupId,
      },
      isArchived: false,
    };

    if (categoryId) {
      where.categoryId = categoryId;
    }

    if (memberId) {
      where.payerId = memberId;
    }

    if (from || to) {
      where.date = {};
      if (from) {
        where.date.gte = new Date(from);
      }
      if (to) {
        const toDate = new Date(to);
        toDate.setDate(toDate.getDate() + 1);
        where.date.lt = toDate;
      }
    }

    const [expenses, total] = await prisma.$transaction([
      prisma.expense.findMany({
        where,
        orderBy: [{ date: "desc" }, { createdAt: "desc" }],
        take: limit,
        skip: offset,
        include: {
          category: {
            select: { name: true, icon: true },
          },
          payer: {
            include: {
              user: {
                select: { name: true, email: true },
              },
            },
          },
        },
      }),
      prisma.expense.count({ where }),
    ]);

    return { expenses, total };
  },

  /**
   * Updates all five mutable fields of an existing expense.
   * Validates that the caller is a member of the expense's group.
   * Returns 404 if expense not found, 403 if not a member.
   */
  async updateExpense(
    expenseId: string,
    fields: {
      description: string;
      amount: number;
      date: string;
      categoryId: string;
      payerId: string;
    },
    callerUserId: string,
  ) {
    const expense = await prisma.expense.findUnique({
      where: { id: expenseId },
      include: { category: { select: { groupId: true } } },
    });

    if (!expense) throw new Error("Expense not found");

    const membership = await prisma.groupMember.findFirst({
      where: {
        groupId: expense.category.groupId,
        userId: callerUserId,
      },
      select: { id: true },
    });

    if (!membership) throw new Error("Not a member of this group");

    return await prisma.expense.update({
      where: { id: expenseId },
      data: {
        description: fields.description,
        amount: fields.amount,
        date: new Date(fields.date),
        categoryId: fields.categoryId,
        payerId: fields.payerId,
      },
    });
  },

  /**
   * Resolves the groupId that owns an expense, via its category — no
   * authorization of its own. Used purely to derive a cache-revalidation
   * path (4b.7) for `deleteExpense`, whose only caller-supplied identifier
   * (`expenseId`) has no `groupId` field of its own; must be looked up
   * before the delete, since the row is gone afterward.
   */
  async getExpenseGroupId(expenseId: string): Promise<string | null> {
    const expense = await prisma.expense.findUnique({
      where: { id: expenseId },
      include: { category: { select: { groupId: true } } },
    });
    return expense?.category.groupId ?? null;
  },

  /**
   * Deletes an expense (Permanent deletion per specification).
   * Validates that the caller is a member of the expense's group.
   */
  async deleteExpense(expenseId: string, callerUserId: string) {
    const expense = await prisma.expense.findUnique({
      where: { id: expenseId },
      include: { category: { select: { groupId: true } } },
    });
    if (!expense) throw new Error("Expense not found");

    const membership = await prisma.groupMember.findFirst({
      where: { groupId: expense.category.groupId, userId: callerUserId },
      select: { id: true },
    });
    if (!membership) throw new Error("Not a member of this group");

    return await prisma.expense.delete({
      where: { id: expenseId },
    });
  },

  /**
   * Archives all expenses in a group (for end-of-month reset).
   */
  async archiveGroupExpenses(groupId: string) {
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
  },

  /**
   * Deletes every expense in a group (permanent deletion).
   */
  async deleteAllExpenses(groupId: string) {
    const categories = await prisma.category.findMany({
      where: { groupId },
      select: { id: true },
    });

    return await prisma.expense.deleteMany({
      where: {
        categoryId: { in: categories.map((c) => c.id) },
      },
    });
  },
};
