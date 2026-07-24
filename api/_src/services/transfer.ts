import { prisma } from "../utils/prisma";
import { Prisma } from "@prisma/client";

const MEMBERS_NOT_IN_CATEGORY =
  "Both members must be assigned to this category to transfer budget.";

/** Look up the `category_members` rows for a pair of group member ids. */
async function findCategoryMemberIds(
  categoryId: string,
  fromMemberId: string,
  toMemberId: string,
) {
  return Promise.all([
    prisma.categoryMember.findUnique({
      where: { categoryId_memberId: { categoryId, memberId: fromMemberId } },
      select: { id: true },
    }),
    prisma.categoryMember.findUnique({
      where: { categoryId_memberId: { categoryId, memberId: toMemberId } },
      select: { id: true },
    }),
  ]);
}

/**
 * For an unrestricted category, verify both members belong to the group and
 * upsert `category_member` rows for ALL group members so that (a) the Transfer
 * FK constraint is satisfied and (b) balances stay consistent for every member.
 */
async function provisionUnrestrictedMembers(
  categoryId: string,
  groupId: string,
  fromMemberId: string,
  toMemberId: string,
) {
  const matchedMembers = await prisma.groupMember.findMany({
    where: { groupId, id: { in: [fromMemberId, toMemberId] } },
    select: { id: true },
  });
  if (matchedMembers.length !== 2) throw new Error(MEMBERS_NOT_IN_CATEGORY);

  const allGroupMembers = await prisma.groupMember.findMany({
    where: { groupId },
    select: { id: true },
  });
  await prisma.categoryMember.createMany({
    data: allGroupMembers.map((m) => ({ categoryId, memberId: m.id })),
    skipDuplicates: true,
  });
}

/**
 * Resolve a pair of group member ids to their `category_members` ids, creating
 * the membership rows on demand for unrestricted categories. Throws if either
 * member is not eligible to transfer in this category.
 */
async function resolveTransferMemberIds(
  categoryId: string,
  fromMemberId: string,
  toMemberId: string,
): Promise<[string, string]> {
  let [from, to] = await findCategoryMemberIds(
    categoryId,
    fromMemberId,
    toMemberId,
  );
  if (from && to) return [from.id, to.id];

  const category = await prisma.category.findUnique({
    where: { id: categoryId },
    select: { groupId: true, memberLinks: { select: { memberId: true } } },
  });
  if (!category) throw new Error("Category not found.");

  const restrictedIds = category.memberLinks.map((ml) => ml.memberId);
  if (restrictedIds.length > 0) {
    if (
      !restrictedIds.includes(fromMemberId) ||
      !restrictedIds.includes(toMemberId)
    ) {
      throw new Error(MEMBERS_NOT_IN_CATEGORY);
    }
  } else {
    await provisionUnrestrictedMembers(
      categoryId,
      category.groupId,
      fromMemberId,
      toMemberId,
    );
  }

  [from, to] = await findCategoryMemberIds(
    categoryId,
    fromMemberId,
    toMemberId,
  );
  if (!from || !to) {
    throw new Error("Failed to resolve category members for transfer.");
  }
  return [from.id, to.id];
}

export const TransferService = {
  /**
   * Creates a budget transfer between two members within a category.
   *
   * `fromMemberId` and `toMemberId` are group member ids. They are resolved to
   * the corresponding `category_members` rows (which the Transfer foreign keys
   * reference) before insertion. Restricted categories require both members to
   * already be linked; unrestricted categories provision links on first use.
   */
  async createTransfer(
    categoryId: string,
    fromMemberId: string,
    toMemberId: string,
    amount: number,
  ) {
    const [fromId, toId] = await resolveTransferMemberIds(
      categoryId,
      fromMemberId,
      toMemberId,
    );

    return await prisma.transfer.create({
      data: {
        categoryId,
        fromMemberId: fromId,
        toMemberId: toId,
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
          category: { select: { id: true, name: true, icon: true } },
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
        categoryId: t.category.id,
        categoryName: t.category.name,
        categoryIcon: t.category.icon ?? "",
        fromMemberId: t.fromMember.member.id,
        fromMemberName:
          t.fromMember.member.user.name ?? t.fromMember.member.user.email,
        toMemberId: t.toMember.member.id,
        toMemberName:
          t.toMember.member.user.name ?? t.toMember.member.user.email,
        amount: Number(t.amount),
        date: t.date,
      })),
      total,
    };
  },

  /**
   * Deletes a transfer (permanent deletion, mirroring deleteExpense).
   */
  async deleteTransfer(transferId: string) {
    return await prisma.transfer.delete({
      where: { id: transferId },
    });
  },

  /**
   * Deletes every transfer in a group (permanent deletion).
   */
  async deleteAllTransfers(groupId: string) {
    const categories = await prisma.category.findMany({
      where: { groupId },
      select: { id: true },
    });

    return await prisma.transfer.deleteMany({
      where: {
        categoryId: { in: categories.map((c) => c.id) },
      },
    });
  },
};
