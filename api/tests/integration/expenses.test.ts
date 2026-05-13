import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ExpenseService } from '../../src/services/expense';
import { prisma } from '../../src/utils/prisma';
import { expenses } from '@prisma/client';

// Mock Prisma
vi.mock('../../src/utils/prisma', () => ({
  prisma: {
    expenses: {
      create: vi.fn(),
      findMany: vi.fn(),
      delete: vi.fn(),
      updateMany: vi.fn(),
    },
    categories: {
      findMany: vi.fn(),
    }
  },
}));

describe('ExpenseService Integration', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should log a new expense correctly', async () => {
    const expenseData = {
      categoryId: 'cat-1',
      payerId: 'member-1',
      description: 'Groceries',
      amount: 50.5,
      date: new Date(),
    };

    vi.mocked(prisma.expenses.create).mockResolvedValue({ id: 'exp-1', ...expenseData } as any);

    const result = await ExpenseService.logExpense(
      expenseData.categoryId,
      expenseData.payerId,
      expenseData.description,
      expenseData.amount,
      expenseData.date
    );

    expect(prisma.expenses.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        categoryId: expenseData.categoryId,
        amount: expenseData.amount,
      }),
    });
    expect(result.id).toBe('exp-1');
  });

  it('should delete an expense permanently', async () => {
    const expenseId = 'exp-1';
    vi.mocked(prisma.expenses.delete).mockResolvedValue({ id: expenseId } as any);

    await ExpenseService.deleteExpense(expenseId);

    expect(prisma.expenses.delete).toHaveBeenCalledWith({
      where: { id: expenseId },
    });
  });
});
