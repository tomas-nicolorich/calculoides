import { prisma } from '../utils/prisma';

export class InvitationService {
  /**
   * Creates a pending invitation for a user to join a group.
   */
  static async createInvitation(groupId: string, inviterId: string, email: string) {
    // Check if user is already a member
    const existingMember = await prisma.group_members.findFirst({
      where: {
        groupId,
        users: { email },
      },
    });

    if (existingMember) {
      throw new Error('User is already a member of this group');
    }

    return await prisma.invitations.create({
      data: {
        groupId,
        inviterId,
        email,
        status: 'pending',
        updatedAt: new Date(),
      },
    });
  }

  /**
   * Accepts an invitation and adds the user to the group.
   */
  static async acceptInvitation(invitationId: string, userId: string) {
    return await prisma.$transaction(async (tx) => {
      const invitation = await tx.invitations.findUnique({
        where: { id: invitationId },
      });

      if (!invitation || invitation.status !== 'pending') {
        throw new Error('Invalid or expired invitation');
      }

      // Verify the user's email matches the invitation (optional, but good for security)
      const user = await tx.calculoides_users.findUnique({
        where: { id: userId },
      });

      if (!user || user.email !== invitation.email) {
        throw new Error('Invitation email mismatch');
      }

      // Add to group_members
      await tx.group_members.create({
        data: {
          userId,
          groupId: invitation.groupId,
          income: 0,
          joinedAt: new Date(),
        },
      });

      // Update invitation status
      return await tx.invitations.update({
        where: { id: invitationId },
        data: { status: 'accepted', updatedAt: new Date() },
      });
    });
  }

  /**
   * Rejects an invitation.
   */
  static async rejectInvitation(invitationId: string) {
    return await prisma.invitations.update({
      where: { id: invitationId },
      data: { status: 'declined', updatedAt: new Date() },
    });
  }

  /**
   * Retrieves pending invitations for a user by their email.
   */
  static async getPendingInvitationsForUser(email: string) {
    return await prisma.invitations.findMany({
      where: { email, status: 'pending' },
      include: {
        groups: {
          select: { name: true },
        },
      },
    });
  }
}
