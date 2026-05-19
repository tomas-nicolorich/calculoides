import { describe, it, expect } from 'vitest';
import { calculateSavingsContributions, calculateProjectedDate } from '../../src/services/savings';

describe('Savings Logic', () => {
  describe('calculateSavingsContributions', () => {
    it('should calculate proportional monthly contributions based on income shares and starting amount', () => {
      const targetAmount = 1200;
      const startingAmount = 200; // 1000 left to save
      const targetDate = new Date();
      targetDate.setMonth(targetDate.getMonth() + 5); // 5 months away -> 200/month total

      const members = [
        { id: '1', share: 0.6 },
        { id: '2', share: 0.4 },
      ];

      const contributions = calculateSavingsContributions(targetAmount, startingAmount, targetDate, members);

      expect(contributions).toHaveLength(2);
      expect(contributions.find(c => c.memberId === '1')?.monthlyContribution).toBe(120);
      expect(contributions.find(c => c.memberId === '2')?.monthlyContribution).toBe(80);
    });

    it('should handle zero members', () => {
      const targetAmount = 1000;
      const startingAmount = 0;
      const targetDate = new Date();
      targetDate.setMonth(targetDate.getMonth() + 10);

      const contributions = calculateSavingsContributions(targetAmount, startingAmount, targetDate, []);
      expect(contributions).toHaveLength(0);
    });

    it('should handle goal already reached', () => {
      const targetAmount = 1000;
      const startingAmount = 1500;
      const targetDate = new Date();
      targetDate.setMonth(targetDate.getMonth() + 10);

      const contributions = calculateSavingsContributions(targetAmount, startingAmount, targetDate, [{ id: '1', share: 1 }]);
      expect(contributions[0].monthlyContribution).toBe(0);
    });
  });

  describe('calculateProjectedDate', () => {
    it('should calculate new projected date when contributions are overridden and starting amount is present', () => {
      const targetAmount = 1200;
      const startingAmount = 200; // 1000 left
      const startDate = new Date('2026-01-01');
      
      // Total: €100/month -> Should take 10 months
      const overrides = [
        { memberId: '1', amount: 50 },
        { memberId: '2', amount: 50 },
      ];

      const projectedDate = calculateProjectedDate(targetAmount, startingAmount, startDate, overrides);
      
      const diffMonths = (projectedDate.getFullYear() - startDate.getFullYear()) * 12 + 
                        (projectedDate.getMonth() - startDate.getMonth());
      
      expect(diffMonths).toBe(10);
    });

    it('should handle zero total contributions by returning a very far date', () => {
      const targetAmount = 1000;
      const startingAmount = 0;
      const startDate = new Date('2026-01-01');
      const projectedDate = calculateProjectedDate(targetAmount, startingAmount, startDate, []);
      expect(projectedDate.getFullYear()).toBe(2126);
    });

    it('should not return Epoch date (1/1/1970) for invalid inputs (BUG-035)', () => {
      const startDate = new Date('2026-05-12');
      
      // Test with zero total contribution
      const res1 = calculateProjectedDate(1000, 0, startDate, [{ memberId: '1', amount: 0 }]);
      expect(res1.getFullYear()).toBe(2126);
      expect(res1.getTime()).not.toBe(0);

      // Test with negative contribution (should be treated as 0 or handled)
      const res2 = calculateProjectedDate(1000, 0, startDate, [{ memberId: '1', amount: -100 }]);
      expect(res2.getFullYear()).toBe(2126);
      expect(res2.getTime()).not.toBe(0);

      // Test with NaN contribution
      const res3 = calculateProjectedDate(1000, 0, startDate, [{ memberId: '1', amount: NaN }]);
      expect(res3.getFullYear()).toBe(2126);
      expect(res3.getTime()).not.toBe(0);
    });

    it('should correctly handle startingAmount when it is 0 and ensure projection is non-null (BUG-036)', () => {
      const targetAmount = 1000;
      const startingAmount = 0;
      const startDate = new Date('2026-06-03');
      const overrides = [{ memberId: '1', amount: 100 }];

      const projectedDate = calculateProjectedDate(targetAmount, startingAmount, startDate, overrides);
      
      expect(projectedDate).toBeDefined();
      expect(projectedDate).not.toBeNull();
      expect(projectedDate instanceof Date).toBe(true);
      expect(projectedDate.getTime()).toBeGreaterThan(0);
      
      // 1000 / 100 = 10 months
      const diffMonths = (projectedDate.getFullYear() - startDate.getFullYear()) * 12 + 
                        (projectedDate.getMonth() - startDate.getMonth());
      expect(diffMonths).toBe(10);
    });
  });
});
