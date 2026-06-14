import { prisma } from "../utils/prisma";
import { Resend } from "resend";
import crypto from "crypto";

const FRONTEND_URL = process.env.FRONTEND_URL ?? "http://localhost:5173";

interface InvitationWithDetails {
  email: string;
  token: string | null;
  inviter: { name: string | null; email: string };
  group: { name: string };
}

export const InvitationService = {
  get resend() {
    return new Resend(process.env.RESEND_API_KEY ?? "re_placeholder");
  },

  /**
   * Creates a pending invitation for a user to join a group and sends an email.
   */
  async createInvitation(
    groupId: string,
    inviterId: string,
    email: string,
  ): Promise<
    InvitationWithDetails & {
      id: string;
      status: string;
      inviterId: string;
      groupId: string;
      updatedAt: Date;
    }
  > {
    const existingMember = await prisma.groupMember.findFirst({
      where: {
        groupId,
        user: { email },
      },
    });

    if (existingMember) {
      throw new Error("User is already a member of this group");
    }

    // Generate a secure, unique token
    const token = crypto.randomBytes(32).toString("hex");

    const invitation = await prisma.invitation.create({
      data: {
        groupId,
        inviterId,
        email,
        token,
        status: "PENDING",
        updatedAt: new Date(),
      },
      include: {
        group: { select: { name: true } },
        inviter: { select: { name: true, email: true } },
      },
    });

    // Send invitation email
    await InvitationService.sendInvitationEmail(invitation);

    return invitation;
  },

  /**
   * Sends the invitation email using Resend.
   */
  async sendInvitationEmail(invitation: InvitationWithDetails) {
    const inviteLink = `${FRONTEND_URL}/invite/${invitation.token ?? ""}`;
    const inviterName = invitation.inviter.name ?? invitation.inviter.email;
    const groupName = invitation.group.name;

    try {
      await InvitationService.resend.emails.send({
        from: "Calculoides <invites@calculoides.com>",
        to: [invitation.email],
        subject: `Join ${groupName} on Calculoides`,
        html: `
          <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #eee; border-radius: 10px;">
            <h1 style="color: #1a1a1a; text-align: center;">You've been invited!</h1>
            <p style="font-size: 16px; color: #4a4a4a; line-height: 1.5;">
              <strong>${inviterName}</strong> has invited you to join the household group <strong>"${groupName}"</strong> on Calculoides.
            </p>
            <p style="font-size: 16px; color: #4a4a4a; line-height: 1.5;">
              Calculoides helps you manage shared expenses and automate proportional sharing based on income.
            </p>
            <div style="margin: 40px 0; text-align: center;">
              <a href="${inviteLink}" style="background-color: #000; color: #fff; padding: 14px 28px; text-decoration: none; border-radius: 6px; font-weight: bold; display: inline-block; font-size: 16px;">
                Join Group
              </a>
            </div>
            <p style="font-size: 14px; color: #666; text-align: center;">
              This link is unique to you and should not be shared.
            </p>
            <p style="font-size: 14px; color: #999; margin-top: 20px;">
              If you didn't expect this invitation, you can safely ignore this email.
            </p>
            <hr style="border: 0; border-top: 1px solid #eee; margin: 30px 0;" />
            <p style="font-size: 12px; color: #999; text-align: center;">
              Calculoides - Shared Household Budgeting
            </p>
          </div>
        `,
      });
    } catch (error) {
      console.error("Failed to send invitation email:", error);
    }
  },

  /**
   * Accepts an invitation and adds the user to the group.
   */
  async acceptInvitation(token: string, userId: string) {
    return await prisma.$transaction(async (tx) => {
      const invitation = await tx.invitation.findUnique({
        where: { token },
      });

      if (invitation?.status !== "PENDING") {
        throw new Error("Invalid or expired invitation");
      }

      // Verify the user's email matches the invitation
      const user = await tx.user.findUnique({
        where: { id: userId },
      });

      if (user?.email !== invitation.email) {
        throw new Error("Invitation email mismatch");
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
        where: { token },
        data: { status: "ACCEPTED", updatedAt: new Date() },
      });
    });
  },

  /**
   * Rejects an invitation.
   */
  async rejectInvitation(token: string) {
    return await prisma.invitation.update({
      where: { token },
      data: { status: "DECLINED", updatedAt: new Date() },
    });
  },

  /**
   * Retrieves pending invitations for a user by their email.
   */
  async getPendingInvitationsForUser(email: string) {
    return await prisma.invitation.findMany({
      where: { email, status: "PENDING" },
      include: {
        group: {
          select: { name: true },
        },
        inviter: {
          select: { name: true, email: true },
        },
      },
    });
  },

  /**
   * Retrieves a specific invitation by its token.
   */
  async getInvitationByToken(token: string) {
    return await prisma.invitation.findUnique({
      where: { token },
      include: {
        group: {
          select: { name: true },
        },
        inviter: {
          select: { name: true, email: true },
        },
      },
    });
  },
};
