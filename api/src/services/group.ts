import { prisma } from '../utils/prisma';

export class GroupService {
  /**
   * Creates a new group and adds the creator as the first member and owner.
   */
  static async createGroup(ownerId: string, name: string) {
    return await prisma.$transaction(async (tx) => {
      const group = await tx.groups.create({
        data: {
          name,
          ownerId,
          updatedAt: new Date(),
        },
      });

      await tx.group_members.create({
        data: {
          userId: ownerId,
          groupId: group.id,
          income: 0,
          joinedAt: new Date(),
        },
      });

      return group;
    });
  }

  /**
   * Retrieves all groups where the user is either the owner or a member.
   */
  static async getGroupsForUser(userId: string) {
    return await prisma.groups.findMany({
      where: {
        OR: [{ ownerId: userId }, { group_members: { some: { userId } } }],
      },
      include: {
        group_members: true,
      },
    });
  }

  /**
   * Updates a member's income for retroactive calculation.
   */
  static async updateMemberIncome(memberId: string, income: number) {
    return await prisma.group_members.update({
      where: { id: memberId },
      data: { income },
    });
  }

  /**
   * Handles automatic ownership succession (FR-010).
   * Transfers ownership to the member with the longest tenure (earliest joinedAt).
   */
  static async handleOwnershipSuccession(groupId: string, leavingOwnerId: string) {
    const nextOwner = await prisma.group_members.findFirst({
      where: {
        groupId,
        NOT: { userId: leavingOwnerId },
      },
      orderBy: { joinedAt: 'asc' },
    });

    if (nextOwner) {
      return await prisma.groups.update({
        where: { id: groupId },
        data: { ownerId: nextOwner.userId },
      });
    }

    // If no members left, the group can remain ownerless or be handled by cleanup
    return null;
  }

  /**
   * Manually transfers ownership to a specific member.
   */
  static async transferOwnership(groupId: string, newOwnerId: string) {
    // Verify the new owner is a member of the group
    const membership = await prisma.group_members.findUnique({
      where: { userId_groupId: { userId: newOwnerId, groupId } },
    });

    if (!membership) {
      throw new Error('New owner must be a member of the group');
    }

    return await prisma.groups.update({
      where: { id: groupId },
      data: { ownerId: newOwnerId },
    });
  }

  static async isOwner(groupId: string, userId: string) {
    const group = await prisma.groups.findUnique({
      where: { id: groupId },
    });
    return group?.ownerId === userId;
  }
}
