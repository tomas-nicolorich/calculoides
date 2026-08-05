import { prisma } from "../../../api/_src/utils/prisma";

export const GroupService = {
  /**
   * Creates a new group and adds the creator as the first member and owner.
   */
  async createGroup(ownerId: string, name: string) {
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
  },

  /**
   * Retrieves all groups where the user is either the owner or a member.
   * Mandated by BUG-014 to include user names in member relations.
   */
  async getGroupsForUser(userId: string) {
    const groups = await prisma.group.findMany({
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

    return groups.map((group) => ({
      ...group,
      members: group.members.map((m) => ({ ...m, income: Number(m.income) })),
      role: group.ownerId === userId ? "OWNER" : "MEMBER",
    }));
  },

  /**
   * Retrieves a specific group by ID, ensuring the user has access.
   */
  async getGroupById(groupId: string, userId: string) {
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
      throw new Error("Unauthorized access to group");
    }

    return {
      ...group,
      members: group.members.map((m) => ({ ...m, income: Number(m.income) })),
    };
  },

  /**
   * Retrieves all members of a group with their user details.
   * Mandated by BUG-014 to include user names.
   */
  async getGroupMembers(groupId: string) {
    const members = await prisma.groupMember.findMany({
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
      orderBy: { joinedAt: "asc" },
    });
    return members.map((m) => ({ ...m, income: Number(m.income) }));
  },

  /**
   * Updates a member's income for retroactive calculation.
   * Mandated by BUG-013 to allow group owners to update any member's income;
   * widened so any member sharing the target's group may also update it.
   */
  async updateMemberIncome(
    requesterId: string,
    memberId: string,
    income: number,
  ) {
    const member = await prisma.groupMember.findUnique({
      where: { id: memberId },
      include: { group: true },
    });

    if (!member) throw new Error("Member not found");

    const isOwner = member.group.ownerId === requesterId;
    const isMember = await prisma.groupMember.findUnique({
      where: {
        userId_groupId: { userId: requesterId, groupId: member.groupId },
      },
    });

    if (!isOwner && !isMember) {
      throw new Error("Unauthorized: not a member of this group");
    }

    return await prisma.groupMember.update({
      where: { id: memberId },
      data: { income },
    });
  },

  /**
   * Removes a member from the group.
   * If the member is the owner, triggers automatic succession.
   * `groupId` must be the member's actual group — verified here rather than
   * trusted from the caller, since the caller-side authorization check is
   * typically performed against a separately supplied groupId.
   */
  async removeMember(groupId: string, memberId: string) {
    const member = await prisma.groupMember.findUnique({
      where: { id: memberId },
      include: { group: true },
    });

    if (!member) throw new Error("Member not found");
    if (member.groupId !== groupId) {
      throw new Error("Member does not belong to this group");
    }

    const isOwner = member.group.ownerId === member.userId;

    await prisma.$transaction(async (tx) => {
      await tx.groupMember.delete({
        where: { id: memberId },
      });

      if (isOwner) {
        await GroupService.handleOwnershipSuccession(groupId, member.userId);
      }
    });
  },

  /**
   * Handles automatic ownership succession (FR-010).
   * Transfers ownership to the member with the longest tenure (earliest joinedAt).
   */
  async handleOwnershipSuccession(groupId: string, leavingOwnerId: string) {
    const nextOwner = await prisma.groupMember.findFirst({
      where: {
        groupId,
        NOT: { userId: leavingOwnerId },
      },
      orderBy: { joinedAt: "asc" },
    });

    if (nextOwner) {
      return await prisma.group.update({
        where: { id: groupId },
        data: { ownerId: nextOwner.userId },
      });
    }

    // If no members left, the group can remain ownerless or be handled by cleanup
    return null;
  },

  /**
   * Manually transfers ownership to a specific member.
   */
  async transferOwnership(groupId: string, newOwnerId: string) {
    // Verify the new owner is a member of the group
    const membership = await prisma.groupMember.findUnique({
      where: { userId_groupId: { userId: newOwnerId, groupId } },
    });

    if (!membership) {
      throw new Error("New owner must be a member of the group");
    }

    return await prisma.group.update({
      where: { id: groupId },
      data: { ownerId: newOwnerId },
    });
  },

  async isOwner(groupId: string, userId: string) {
    const group = await prisma.group.findUnique({
      where: { id: groupId },
    });
    return group?.ownerId === userId;
  },
};
