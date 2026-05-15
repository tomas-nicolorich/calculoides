import { describe, it, expect, vi, beforeEach } from 'vitest';
import expenseHandler from '../../expenses';
import { prisma } from '../../src/utils/prisma';
import { getUserFromSession } from '../../src/services/auth';

// Mock Prisma
vi.mock('../../src/utils/prisma', () => ({
  prisma: {
    expense: {
      create: vi.fn(),
    },
    groupMember: {
      findFirst: vi.fn().mockResolvedValue({ id: 'member-1' }),
      findUnique: vi.fn(),
    },
    category: {
      findUnique: vi.fn().mockResolvedValue({ groupId: 'group-1' }),
    }
  },
}));

// Mock Auth
vi.mock('../../src/services/auth', () => ({
  getUserFromSession: vi.fn(),
  extractTokenFromHeader: vi.fn(() => 'mock-token'),
}));

describe('API Date Coercion (BUG-012)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(getUserFromSession).mockResolvedValue({ id: 'user-1' } as any);
  });

  it('should coerce ISO string date in expense creation', async () => {
    const isoDate = '2026-05-15T12:00:00.000Z';
    const req = {
      method: 'POST',
      headers: { authorization: 'Bearer mock-token' },
      body: {
        categoryId: '550e8400-e29b-41d4-a716-446655440000', // Valid UUID
        description: 'Test Expense',
        amount: 10,
        date: isoDate,
      },
      query: {},
    };
    
    const res = {
      status: vi.fn().mockReturnThis(),
      json: vi.fn().mockReturnThis(),
      setHeader: vi.fn(),
      end: vi.fn(),
      headersSent: false,
    };

    // Vercel handlers are wrapped with withErrorHandling and withAuth
    await expenseHandler(req as any, res as any);

    expect(prisma.expense.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          date: new Date(isoDate),
        }),
      })
    );
    expect(res.status).toHaveBeenCalledWith(201);
  });
});
