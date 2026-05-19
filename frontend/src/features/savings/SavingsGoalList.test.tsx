import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { SavingsGoalList } from './SavingsGoalList';
import { apiClient } from '../../shared/api/client';
import { vi, describe, it, expect } from 'vitest';

// Mock the API client
vi.mock('../../shared/api/client', () => ({
  apiClient: {
    savings: {
      upsertContribution: vi.fn().mockResolvedValue({}),
    },
  },
}));

// Mock UserDisplay to simplify testing
vi.mock('../../shared/ui', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../../shared/ui')>();
  return {
    ...actual,
    UserDisplay: ({ user }: { user?: { name: string | null; email: string } }) => <span>{user?.name ?? user?.email}</span>,
  };
});

const mockGoals = [
  {
    id: 'goal-1',
    groupId: 'group-1',
    name: 'Vacation',
    targetAmount: 1200,
    startingAmount: 0,
    targetDate: '2026-12-31T00:00:00.000Z',
    projectedDate: '2026-12-31T00:00:00.000Z',
    varianceMonths: 0,
    breakdown: [
      {
        memberId: 'member-1',
        proportionalAmount: 100,
        actualAmount: 100,
        isOverridden: false,
        user: { name: 'Alice', email: 'alice@example.com' },
      },
    ],
  },
];

describe('SavingsGoalList', () => {
  it('triggers onRefresh immediately after contribution change', async () => {
    const onRefresh = vi.fn();
    render(<SavingsGoalList goals={mockGoals} onRefresh={onRefresh} />);

    // Click Adjust button
    const adjustButton = screen.getByText('Adjust');
    fireEvent.click(adjustButton);

    // Change the contribution amount
    const input = screen.getByRole('spinbutton');
    fireEvent.change(input, { target: { value: '150' } });

    // Click Save Adjustments
    const saveButton = screen.getByText('Save Adjustments');
    fireEvent.click(saveButton);

    // Verify API call was made correctly
    expect(apiClient.savings.upsertContribution).toHaveBeenCalledWith('goal-1', 'member-1', 150);

    // Verify onRefresh is called WITHOUT waiting for the 1.5s timeout that existed before
    await waitFor(() => {
      expect(onRefresh).toHaveBeenCalled();
    }, { timeout: 1000 }); // Short timeout to ensure it's "immediate"

    // Verify success feedback is visible
    expect(screen.getByText(/Changes saved successfully/i)).toBeInTheDocument();
  });

  it('displays the projected date and variance correctly', () => {
    const goalsWithVariance = [
      {
        ...mockGoals[0],
        id: 'goal-2',
        name: 'New Car',
        projectedDate: '2027-06-30T00:00:00.000Z',
        varianceMonths: 6,
      },
    ];

    render(<SavingsGoalList goals={goalsWithVariance} />);

    expect(screen.getByText(/Delayed by 6mo/i)).toBeInTheDocument();
    
    // Check for the date display (using a flexible regex for date formats)
    const dateDisplay = screen.getByText(/2027/);
    expect(dateDisplay).toBeInTheDocument();
    expect(dateDisplay).not.toHaveTextContent('1970');
  });
});
