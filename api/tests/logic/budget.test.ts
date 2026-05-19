import { describe, it, expect } from 'vitest';
import { calculateCategoryBalances } from '../../src/services/calculation';

describe('Category Balance Calculation', () => {
  it('should correctly distribute monthly budget among members based on shares', () => {
    const members = [
      { id: 'm1', share: 0.67 },
      { id: 'm2', share: 0.33 },
    ];
    const category = {
      monthlyBudget: 1000,
    };
    const expenses = [
      { payerId: 'm1', amount: 100 },
      { payerId: 'm2', amount: 50 },
    ];

    const balances = calculateCategoryBalances(category, members, expenses);

    // m1 quota: 1000 * 0.67 = 670. spent: 100. balance: 570
    // m2 quota: 1000 * 0.33 = 330. spent: 50. balance: 280
    expect(balances.find(b => b.memberId === 'm1')?.remainingQuota).toBe(570);
    expect(balances.find(b => b.memberId === 'm2')?.remainingQuota).toBe(280);
    expect(balances.reduce((acc, b) => acc + b.remainingQuota, 0)).toBe(850);
  });

  it('should handle zero expenses', () => {
    const members = [{ id: 'm1', share: 1.0 }];
    const category = { monthlyBudget: 500 };
    const balances = calculateCategoryBalances(category, members, []);

    expect(balances[0].remainingQuota).toBe(500);
    expect(balances[0].spent).toBe(0);
  });

  it('should reflect transfers in member balances', () => {
    const members = [
      { id: 'm1', share: 0.5 },
      { id: 'm2', share: 0.5 },
    ];
    const category = { monthlyBudget: 1000 };
    // Transfer 50 from m1 to m2
    const transfers = [
      { fromMemberId: 'm1', toMemberId: 'm2', amount: 50 },
    ];

    const balances = calculateCategoryBalances(category, members, [], transfers);

    // m1 quota: 500 - 50 = 450
    // m2 quota: 500 + 50 = 550
    expect(balances.find(b => b.memberId === 'm1')?.remainingQuota).toBe(450);
    expect(balances.find(b => b.memberId === 'm2')?.remainingQuota).toBe(550);
  });
});
