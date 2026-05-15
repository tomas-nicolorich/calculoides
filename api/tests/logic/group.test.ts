import { describe, it, expect, vi, beforeEach } from 'vitest';
import { GroupService } from '../../src/services/group';
import { prisma } from '../../src/utils/prisma';

vi.mock('../../src/utils/prisma', () => ({
  prisma: {
    group: {
      update: vi.fn(),
      findUnique: vi.fn(),
    },
    groupMember: {
      findFirst: vi.fn(),
      findUnique: vi.fn(),
      delete: vi.fn(),
    },
    $transaction: vi.fn((cb) => cb(prisma)),
  },
}));

describe('GroupService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('handleOwnershipSuccession', () => {
    it('should transfer ownership to the member with the longest tenure', async () => {
      const groupId = 'group-1';
      const leavingOwnerId = 'owner-1';
      const nextOwner = { userId: 'member-2', joinedAt: new Date('2026-01-01') };

      vi.mocked(prisma.groupMember.findFirst).mockResolvedValue(nextOwner as any);
      vi.mocked(prisma.group.update).mockResolvedValue({ id: groupId, ownerId: nextOwner.userId } as any);

      await GroupService.handleOwnershipSuccession(groupId, leavingOwnerId);

      expect(prisma.groupMember.findFirst).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            groupId,
            NOT: { userId: leavingOwnerId },
          }),
          orderBy: { joinedAt: 'asc' },
        })
      );

      expect(prisma.group.update).toHaveBeenCalledWith({
        where: { id: groupId },
        data: { ownerId: nextOwner.userId },
      });
    });

    it('should return null if no other members exist', async () => {
      vi.mocked(prisma.groupMember.findFirst).mockResolvedValue(null);

      const result = await GroupService.handleOwnershipSuccession('group-1', 'owner-1');

      expect(result).toBeNull();
      expect(prisma.group.update).not.toHaveBeenCalled();
    });
  });
});
