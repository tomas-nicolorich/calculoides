import { describe, it, expect, vi, beforeEach } from 'vitest';
import { InvitationService } from '../../src/services/invitation';
import { prisma } from '../../src/utils/prisma';
import { Resend } from 'resend';

// Mock Prisma
vi.mock('../../src/utils/prisma', () => ({
  prisma: {
    $transaction: vi.fn((cb) => cb(prisma)),
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
vi.mock('resend', () => {
  return {
    Resend: class {
      emails = {
        send: vi.fn().mockResolvedValue({ id: 'email-id' }),
      };
    },
  };
});

describe('InvitationService Integration', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should create an invitation and send an email', async () => {
    const groupId = 'group-1';
    const inviterId = 'user-1';
    const email = 'test@example.com';

    vi.mocked(prisma.groupMember.findFirst).mockResolvedValue(null);
    vi.mocked(prisma.invitation.create).mockResolvedValue({
      id: 'invitation-1',
      groupId,
      inviterId,
      email,
      status: 'PENDING',
      group: { name: 'Household' },
      inviter: { name: 'John Doe', email: 'john@example.com' },
    } as any);

    const result = await InvitationService.createInvitation(groupId, inviterId, email);

    expect(prisma.invitation.create).toHaveBeenCalled();
    expect(result.id).toBe('invitation-1');
  });

  it('should accept an invitation', async () => {
    const invitationId = 'invitation-1';
    const userId = 'user-2';

    vi.mocked(prisma.invitation.findUnique).mockResolvedValue({
      id: invitationId,
      groupId: 'group-1',
      email: 'user2@example.com',
      status: 'PENDING',
    } as any);
    vi.mocked(prisma.user.findUnique).mockResolvedValue({
      id: userId,
      email: 'user2@example.com',
    } as any);
    vi.mocked(prisma.invitation.update).mockResolvedValue({ status: 'ACCEPTED' } as any);

    const result = await InvitationService.acceptInvitation(invitationId, userId);

    expect(prisma.groupMember.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        userId,
        groupId: 'group-1',
      }),
    });
    expect(result.status).toBe('ACCEPTED');
  });
});
