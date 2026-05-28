import { describe, it, expect } from 'vitest';
import { calculateTotalIncome } from '../../../src/shared/api/dashboardUtils';

describe('Dashboard Utils', () => {
  it('calculates total income correctly', () => {
    const members = [
      { income: 1000 },
      { income: 2000 },
      { income: 500 }
    ];
    expect(calculateTotalIncome(members)).toBe(3500);
  });

  it('handles empty members list for income calculation', () => {
    expect(calculateTotalIncome([])).toBe(0);
  });
});
