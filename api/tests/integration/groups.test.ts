import { describe, it, expect, vi, beforeEach } from 'vitest';
import { GroupService } from '../../src/services/group';
import { prisma } from '../../src/utils/prisma';
import { Group, GroupMember } from '@prisma/client';

// Mock Prisma
vi.mock('../../src/utils/prisma', () => ({
  prisma: {
    $transaction: vi.fn((cb) => cb({
      group: {
        create: vi.fn().mockResolvedValue({ id: 'group-1', name: 'Household', ownerId: 'user-1' } as Group),
      },
      groupMember: {
        create: vi.fn().mockResolvedValue({ id: 'member-1' } as GroupMember),
      },
    })),
    group: {
      findMany: vi.fn(),
      update: vi.fn(),
    },
    groupMember: {
      findFirst: vi.fn(),
      findUnique: vi.fn(),
      update: vi.fn(),
    },
  },
}));

describe('GroupService Integration', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should create a group and its first member', async () => {
    const ownerId = 'user-1';
    const name = 'Household';

    const result = await GroupService.createGroup(ownerId, name);

    expect(result).toEqual(expect.objectContaining({ id: 'group-1', name }));
  });

  it('should transfer ownership correctly', async () => {
    const groupId = 'group-1';
    const newOwnerId = 'user-2';

    vi.mocked(prisma.groupMember.findUnique).mockResolvedValue({ id: 'member-2' } as GroupMember);
    vi.mocked(prisma.group.update).mockResolvedValue({ id: groupId, ownerId: newOwnerId } as Group);

    const result = await GroupService.transferOwnership(groupId, newOwnerId);

    expect(prisma.group.update).toHaveBeenCalledWith({
      where: { id: groupId },
      data: { ownerId: newOwnerId },
    });
    expect(result?.ownerId).toBe(newOwnerId);
  });
});
