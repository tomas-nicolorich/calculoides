/* eslint-disable @typescript-eslint/unbound-method */
import { describe, it, expect, vi, beforeEach } from "vitest";
import { InvitationService } from "../../../lib/server/services/invitation";
import { prisma } from "../../_src/utils/prisma";
import { Invitation, User, Prisma } from "@prisma/client";

// Mock Prisma
vi.mock("../../_src/utils/prisma", () => ({
  prisma: {
    $transaction: vi.fn(
      (cb: (tx: Prisma.TransactionClient) => Promise<unknown>) =>
        cb(prisma as unknown as Prisma.TransactionClient),
    ),
    invitation: {
      create: vi.fn(),
      findUnique: vi.fn(),
      findMany: vi.fn(),
      update: vi.fn(),
    },
    groupMember: {
      findFirst: vi.fn(),
      create: vi.fn(),
    },
    user: {
      findUnique: vi.fn(),
    },
  },
}));

// Mock Resend
vi.mock("resend", () => {
  return {
    Resend: class {
      emails = {
        send: vi.fn().mockResolvedValue({ id: "email-id" }),
      };
    },
  };
});

describe("InvitationService Integration", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should create an invitation and send an email", async () => {
    const groupId = "group-1";
    const inviterId = "user-1";
    const email = "test@example.com";

    vi.mocked(prisma.groupMember.findFirst).mockResolvedValue(null);
    vi.mocked(prisma.invitation.create).mockResolvedValue({
      id: "invitation-1",
      token: "secure-token",
      groupId,
      inviterId,
      email,
      status: "PENDING",
      group: { name: "Household" },
      inviter: { name: "John Doe", email: "john@example.com" },
    } as unknown as Invitation);

    const result = await InvitationService.createInvitation(
      groupId,
      inviterId,
      email,
    );

    expect(vi.mocked(prisma.invitation.create)).toHaveBeenCalled();
    expect(result.token).toBe("secure-token");
  });

  it("should accept an invitation using token", async () => {
    const token = "secure-token";
    const userId = "user-2";

    vi.mocked(prisma.invitation.findUnique).mockResolvedValue({
      id: "invitation-1",
      token,
      groupId: "group-1",
      email: "user2@example.com",
      status: "PENDING",
    } as unknown as Invitation);
    vi.mocked(prisma.user.findUnique).mockResolvedValue({
      id: userId,
      email: "user2@example.com",
    } as unknown as User);
    vi.mocked(prisma.invitation.update).mockResolvedValue({
      status: "ACCEPTED",
    } as unknown as Invitation);

    const result = await InvitationService.acceptInvitation(token, userId);

    expect(vi.mocked(prisma.groupMember.create)).toHaveBeenCalled();
    expect(result.status).toBe("ACCEPTED");
  });
});
