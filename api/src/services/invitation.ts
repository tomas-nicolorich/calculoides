import { prisma } from '../utils/prisma';
import { Resend } from 'resend';

const FRONTEND_URL = process.env.FRONTEND_URL || 'http://localhost:5173';

export class InvitationService {
  private static get resend() {
    return new Resend(process.env.RESEND_API_KEY || 're_placeholder');
  }

  /**
   * Creates a pending invitation for a user to join a group and sends an email.
   */
  static async createInvitation(groupId: string, inviterId: string, email: string) {
    // ... (rest of createInvitation)

    const existingMember = await prisma.groupMember.findFirst({
      where: {
        groupId,
        user: { email },
      },
    });

    if (existingMember) {
      throw new Error('User is already a member of this group');
    }

    const invitation = await prisma.invitation.create({
      data: {
        groupId,
        inviterId,
        email,
        status: 'PENDING',
        updatedAt: new Date(),
      },
      include: {
        group: { select: { name: true } },
        inviter: { select: { name: true, email: true } },
      },
    });

    // Send invitation email
    await this.sendInvitationEmail(invitation);

    return invitation;
  }

  /**
   * Sends the invitation email using Resend.
   */
  private static async sendInvitationEmail(invitation: any) {
    const inviteLink = `${FRONTEND_URL}/invite/${invitation.id}`;
    const inviterName = invitation.inviter.name || invitation.inviter.email;
    const groupName = invitation.group.name;

    try {
      await this.resend.emails.send({
        from: 'Calculoides <invites@calculoides.com>',
        to: [invitation.email],
        subject: `Join ${groupName} on Calculoides`,
        html: `
          <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #eee; border-radius: 10px;">
            <h1 style="color: #1a1a1a;">You've been invited!</h1>
            <p style="font-size: 16px; color: #4a4a4a;">
              <strong>${inviterName}</strong> has invited you to join the household group <strong>"${groupName}"</strong> on Calculoides.
            </p>
            <p style="font-size: 16px; color: #4a4a4a;">
              Calculoides helps you manage shared expenses and automate proportional sharing based on income.
            </p>
            <div style="margin: 30px 0; text-align: center;">
              <a href="${inviteLink}" style="background-color: #000; color: #fff; padding: 12px 24px; text-decoration: none; border-radius: 5px; font-weight: bold; display: inline-block;">
                Join Group
              </a>
            </div>
            <p style="font-size: 14px; color: #999;">
              If you didn't expect this invitation, you can safely ignore this email.
            </p>
            <hr style="border: 0; border-top: 1px solid #eee; margin: 20px 0;" />
            <p style="font-size: 12px; color: #999; text-align: center;">
              Calculoides - Shared Household Budgeting
            </p>
          </div>
        `,
      });
    } catch (error) {
      console.error('Failed to send invitation email:', error);
      // We don't throw here to avoid failing the whole request, 
      // but in production we might want more robust error handling.
    }
  }

  /**
   * Accepts an invitation and adds the user to the group.
   */
  static async acceptInvitation(invitationId: string, userId: string) {
    return await prisma.$transaction(async (tx) => {
      const invitation = await tx.invitation.findUnique({
        where: { id: invitationId },
      });

      if (!invitation || invitation.status !== 'PENDING') {
        throw new Error('Invalid or expired invitation');
      }

      // Verify the user's email matches the invitation (optional, but good for security)
      const user = await tx.user.findUnique({
        where: { id: userId },
      });

      if (!user || user.email !== invitation.email) {
        throw new Error('Invitation email mismatch');
      }

      // Add to groupMember
      await tx.groupMember.create({
        data: {
          userId,
          groupId: invitation.groupId,
          income: 0,
          joinedAt: new Date(),
        },
      });

      // Update invitation status
      return await tx.invitation.update({
        where: { id: invitationId },
        data: { status: 'ACCEPTED', updatedAt: new Date() },
      });
    });
  }

  /**
   * Rejects an invitation.
   */
  static async rejectInvitation(invitationId: string) {
    return await prisma.invitation.update({
      where: { id: invitationId },
      data: { status: 'DECLINED', updatedAt: new Date() },
    });
  }

  /**
   * Retrieves pending invitations for a user by their email.
   */
  static async getPendingInvitationsForUser(email: string) {
    return await prisma.invitation.findMany({
      where: { email, status: 'PENDING' },
      include: {
        group: {
          select: { name: true },
        },
        inviter: {
          select: { name: true, email: true },
        },
      },
    });
  }

  /**
   * Retrieves a specific invitation by its token (ID).
   */
  static async getInvitationByToken(token: string) {
    return await prisma.invitation.findUnique({
      where: { id: token },
      include: {
        group: {
          select: { name: true },
        },
        inviter: {
          select: { name: true, email: true },
        },
      },
    });
  }
}
