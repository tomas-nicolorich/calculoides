/* eslint-disable @typescript-eslint/unbound-method */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ExpenseService } from '../../src/services/expense';
import { prisma } from '../../src/utils/prisma';
import { Category, GroupMember, Expense } from '@prisma/client';

// Mock Prisma
vi.mock('../../src/utils/prisma', () => ({
  prisma: {
    expense: {
      create: vi.fn(),
      findMany: vi.fn(),
      delete: vi.fn(),
      updateMany: vi.fn(),
    },
    category: {
      findMany: vi.fn(),
      findUnique: vi.fn(),
    },
    groupMember: {
      findFirst: vi.fn(),
    }
  },
}));

describe('ExpenseService Integration', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should log a new expense correctly with ISO date string', async () => {
    const expenseData = {
      categoryId: 'cat-1',
      payerId: 'member-1',
      description: 'Groceries',
      amount: 50.5,
      date: new Date().toISOString(), // ISO String
    };

    // Mock category resolution
    vi.mocked(prisma.category.findUnique).mockResolvedValue({ id: 'cat-1', groupId: 'group-1' } as unknown as Category);
    // Mock membership resolution
    vi.mocked(prisma.groupMember.findFirst).mockResolvedValue({ id: 'member-1' } as unknown as GroupMember);
    // Mock expense creation
    vi.mocked(prisma.expense.create).mockResolvedValue({ id: 'exp-1', ...expenseData, date: new Date(expenseData.date) } as unknown as Expense);

    const result = await ExpenseService.logExpense(
      expenseData.categoryId,
      expenseData.payerId,
      expenseData.description,
      expenseData.amount,
      new Date(expenseData.date)
    );

    expect(result.id).toBe('exp-1');
  });

  it('should delete an expense permanently', async () => {
    const expenseId = 'exp-1';
    vi.mocked(prisma.expense.delete).mockResolvedValue({ id: expenseId } as unknown as Expense);

    await ExpenseService.deleteExpense(expenseId);

    expect(vi.mocked(prisma.expense.delete)).toHaveBeenCalledWith({
      where: { id: expenseId },
    });
  });
});
