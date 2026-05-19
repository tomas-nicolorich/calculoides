/* eslint-disable @typescript-eslint/unbound-method */
import { describe, it, expect, vi } from 'vitest';
import { ArchiveService } from '../../src/services/archive';
import { GroupService } from '../../src/services/group';
import { prisma } from '../../src/utils/prisma';

vi.mock('../../src/utils/prisma', () => ({
  prisma: {
    expense: {
      updateMany: vi.fn(),
    },
    group: {
      findUnique: vi.fn(),
    },
  },
}));

vi.mock('../../src/services/group', () => ({
  GroupService: {
    isOwner: vi.fn(),
  },
}));

describe('Archive Integration', () => {
  it('should allow owner to archive expenses', async () => {
    vi.mocked(GroupService.isOwner).mockResolvedValue(true);
    vi.mocked(prisma.expense.updateMany).mockResolvedValue({ count: 5 });

    const result = await ArchiveService.archiveExpenses('group-1', 'owner-1');
    
    expect(result).toBe(true);
    expect(prisma.expense.updateMany).toHaveBeenCalledWith({
      where: {
        category: { groupId: 'group-1' },
        isArchived: false,
      },
      data: { isArchived: true },
    });
  });

  it('should deny non-owner from archiving expenses', async () => {
    vi.mocked(GroupService.isOwner).mockResolvedValue(false);

    await expect(ArchiveService.archiveExpenses('group-1', 'member-1'))
      .rejects.toThrow('Only the group owner can archive expenses');
  });
});
