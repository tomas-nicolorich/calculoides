import { prisma } from '../utils/prisma';

export class GroupService {
  /**
   * Creates a new group and adds the creator as the first member and owner.
   */
  static async createGroup(ownerId: string, name: string) {
    return await prisma.$transaction(async (tx) => {
      const group = await tx.group.create({
        data: {
          name,
          ownerId,
          updatedAt: new Date(),
        },
      });

      await tx.groupMember.create({
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
   * Mandated by BUG-014 to include user names in member relations.
   */
  static async getGroupsForUser(userId: string) {
    return await prisma.group.findMany({
      where: {
        OR: [{ ownerId: userId }, { members: { some: { userId } } }],
      },
      include: {
        members: {
          include: {
            user: {
              select: {
                id: true,
                name: true,
                email: true,
              },
            },
          },
        },
      },
    });
  }

  /**
   * Retrieves a specific group by ID, ensuring the user has access.
   */
  static async getGroupById(groupId: string, userId: string) {
    const group = await prisma.group.findUnique({
      where: { id: groupId },
      include: {
        members: {
          include: {
            user: {
              select: {
                id: true,
                name: true,
                email: true,
              },
            },
          },
        },
      },
    });

    if (!group) return null;

    // Check if user is a member or owner
    const isMember = group.members.some((m) => m.userId === userId);
    const isOwner = group.ownerId === userId;

    if (!isMember && !isOwner) {
      throw new Error('Unauthorized access to group');
    }

    return group;
  }

  /**
   * Retrieves all members of a group with their user details.
   * Mandated by BUG-014 to include user names.
   */
  static async getGroupMembers(groupId: string) {
    return await prisma.groupMember.findMany({
      where: { groupId },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
      orderBy: { joinedAt: 'asc' },
    });
  }

  /**
   * Updates a member's income for retroactive calculation.
   * Mandated by BUG-013 to allow group owners to update any member's income.
   */
  static async updateMemberIncome(requesterId: string, memberId: string, income: number) {
    const member = await prisma.groupMember.findUnique({
      where: { id: memberId },
      include: { group: true },
    });

    if (!member) throw new Error('Member not found');

    const isOwner = member.group.ownerId === requesterId;
    const isSelf = member.userId === requesterId;

    if (!isOwner && !isSelf) {
      throw new Error('Unauthorized: Only the group owner or the member themselves can update income');
    }

    return await prisma.groupMember.update({
      where: { id: memberId },
      data: { income },
    });
  }

  /**
   * Removes a member from the group.
   * If the member is the owner, triggers automatic succession.
   */
  static async removeMember(groupId: string, memberId: string) {
    const member = await prisma.groupMember.findUnique({
      where: { id: memberId },
      include: { group: true },
    });

    if (!member) throw new Error('Member not found');

    const isOwner = member.group.ownerId === member.userId;

    return await prisma.$transaction(async (tx) => {
      await tx.groupMember.delete({
        where: { id: memberId },
      });

      if (isOwner) {
        await GroupService.handleOwnershipSuccession(groupId, member.userId);
      }
    });
  }

  /**
   * Handles automatic ownership succession (FR-010).
   * Transfers ownership to the member with the longest tenure (earliest joinedAt).
   */
  static async handleOwnershipSuccession(groupId: string, leavingOwnerId: string) {
    const nextOwner = await prisma.groupMember.findFirst({
      where: {
        groupId,
        NOT: { userId: leavingOwnerId },
      },
      orderBy: { joinedAt: 'asc' },
    });

    if (nextOwner) {
      return await prisma.group.update({
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
    const membership = await prisma.groupMember.findUnique({
      where: { userId_groupId: { userId: newOwnerId, groupId } },
    });

    if (!membership) {
      throw new Error('New owner must be a member of the group');
    }

    return await prisma.group.update({
      where: { id: groupId },
      data: { ownerId: newOwnerId },
    });
  }

  static async isOwner(groupId: string, userId: string) {
    const group = await prisma.group.findUnique({
      where: { id: groupId },
    });
    return group?.ownerId === userId;
  }
}
