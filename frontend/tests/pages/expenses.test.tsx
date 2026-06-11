import { render, screen, within } from '@testing-library/react';
import { DashboardPage } from '@/pages/dashboard/ui/DashboardPage';
import { describe, it, expect, vi } from 'vitest';
import { MemoryRouter, Route, Routes } from 'react-router-dom';

// Mock the AuthContext
vi.mock('@/app/providers/AuthContext', () => ({
  useAuth: () => ({
    user: { id: '1', email: 'test@example.com' },
    signOut: vi.fn()
  })
}));

// Mock the hooks
vi.mock('@/shared/api/dashboardHooks', () => ({
  useDashboardSummary: () => ({
    data: {
      groupName: 'Test Group',
      ownerId: '1',
      totalIncome: 5000,
      totalBudget: 4000,
      totalSpent: 1000,
      members: [],
      recentExpenses: [
        { id: '1', description: 'Test Expense', amount: 100, date: new Date().toISOString(), categoryName: 'Food', payerName: 'Member A' }
      ],
      recentTransfers: []
    },
    loading: false,
    error: null
  }),
  useCategoriesList: () => ({
    data: [],
    loading: false
  }),
  useExpensesList: () => ({
    data: { expenses: [], pagination: { total: 0, limit: 50, offset: 0 } },
    loading: false
  })
}));

describe('Expenses Navigation', () => {
  it('navigates to expenses page when clicking View All from Expenses card', () => {
    render(
      <MemoryRouter initialEntries={['/dashboard/123']}>
        <Routes>
          <Route path="/dashboard/:groupId" element={<DashboardPage />} />
          <Route path="/expenses" element={<div>Expenses Page Content</div>} />
        </Routes>
      </MemoryRouter>
    );
    
    const expensesHeading = screen.getByRole('heading', { name: /Expenses/i });
    const expensesCard = expensesHeading.closest('div');
    if (!expensesCard) throw new Error('Expenses card not found');
    const viewAllLink = within(expensesCard).getByRole('link', { name: /view all/i });
    
    expect(viewAllLink).toHaveAttribute('href', '/expenses');
  });
});
