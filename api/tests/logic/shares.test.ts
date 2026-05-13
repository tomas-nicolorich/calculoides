import { describe, it, expect } from 'vitest';
import { calculateIncomeShares, MemberIncome } from '../../src/services/calculation';

describe('Income Share Calculation', () => {
  it('should calculate proportional shares for a simple group', () => {
    const members: MemberIncome[] = [
      { id: '1', income: 2000 },
      { id: '2', income: 1000 },
    ];
    const shares = calculateIncomeShares(members);
    
    expect(shares.find(s => s.id === '1')?.share).toBe(0.67);
    expect(shares.find(s => s.id === '2')?.share).toBe(0.33);
    expect(shares.reduce((acc, s) => acc + s.percentage, 0)).toBe(100);
  });

  it('should absorb rounding remainder by the highest earner', () => {
    // 100 / 3 = 33.333...
    const members: MemberIncome[] = [
      { id: '1', income: 1000 },
      { id: '2', income: 1000 },
      { id: '3', income: 1000 },
    ];
    const shares = calculateIncomeShares(members);
    
    // Total should be 100%. Each is 33.33%. Remainder is 0.01%.
    const totalPercentage = shares.reduce((acc, s) => acc + s.percentage, 0);
    expect(totalPercentage).toBe(100);
    
    const individualPercentages = shares.map(s => s.percentage);
    expect(individualPercentages).toContain(33.34);
    expect(individualPercentages.filter(s => s === 33.33).length).toBe(2);
  });

  it('should handle zero total income by giving equal shares', () => {
     const members: MemberIncome[] = [
      { id: '1', income: 0 },
      { id: '2', income: 0 },
    ];
    const shares = calculateIncomeShares(members);
    expect(shares.find(s => s.id === '1')?.percentage).toBe(50);
    expect(shares.find(s => s.id === '2')?.percentage).toBe(50);
  });
});
