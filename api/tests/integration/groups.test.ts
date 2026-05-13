import { describe, it, expect, vi, beforeEach } from 'vitest';
import { GroupService } from '../../src/services/group';
import { prisma } from '../../src/utils/prisma';
import { groups, group_members } from '@prisma/client';

// Mock Prisma
vi.mock('../../src/utils/prisma', () => ({
  prisma: {
    $transaction: vi.fn((cb) => cb({
      groups: {
        create: vi.fn().mockResolvedValue({ id: 'group-1', name: 'Household', ownerId: 'user-1' } as groups),
      },
      group_members: {
        create: vi.fn().mockResolvedValue({ id: 'member-1' } as group_members),
      },
    })),
    groups: {
      findMany: vi.fn(),
      update: vi.fn(),
    },
    group_members: {
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

    vi.mocked(prisma.group_members.findUnique).mockResolvedValue({ id: 'member-2' } as group_members);
    vi.mocked(prisma.groups.update).mockResolvedValue({ id: groupId, ownerId: newOwnerId } as groups);

    const result = await GroupService.transferOwnership(groupId, newOwnerId);

    expect(prisma.groups.update).toHaveBeenCalledWith({
      where: { id: groupId },
      data: { ownerId: newOwnerId },
    });
    expect(result?.ownerId).toBe(newOwnerId);
  });
});
