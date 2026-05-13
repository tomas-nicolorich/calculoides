import { prisma } from '../utils/prisma';
import { GroupService } from './group';

export class ArchiveService {
  /**
   * Archives all non-archived expenses for a group.
   * Resets the spent balance conceptually by marking expenses as archived.
   */
  static async archiveExpenses(groupId: string, userId: string) {
    const isOwner = await GroupService.isOwner(groupId, userId);
    
    if (!isOwner) {
      throw new Error('Only the group owner can archive expenses');
    }

    await prisma.expenses.updateMany({
      where: {
        categories: { groupId },
        isArchived: false,
      },
      data: { isArchived: true },
    });

    return true;
  }
}
