import { describe, it, expect } from 'vitest';
import { calculateSavingsContributions, calculateProjectedDate } from '../../src/services/savings';

describe('Savings Logic', () => {
  describe('calculateSavingsContributions', () => {
    it('should calculate proportional monthly contributions based on income shares', () => {
      const targetAmount = 1200;
      const targetDate = new Date();
      targetDate.setMonth(targetDate.getMonth() + 6); // 6 months away

      const members = [
        { id: '1', share: 0.6 },
        { id: '2', share: 0.4 },
      ];

      const contributions = calculateSavingsContributions(targetAmount, targetDate, members);

      expect(contributions).toHaveLength(2);
      expect(contributions.find(c => c.memberId === '1')?.monthlyContribution).toBe(120);
      expect(contributions.find(c => c.memberId === '2')?.monthlyContribution).toBe(80);
    });

    it('should handle zero members', () => {
      const targetAmount = 1000;
      const targetDate = new Date();
      targetDate.setMonth(targetDate.getMonth() + 10);

      const contributions = calculateSavingsContributions(targetAmount, targetDate, []);
      expect(contributions).toHaveLength(0);
    });
  });

  describe('calculateProjectedDate', () => {
    it('should calculate new projected date when contributions are overridden', () => {
      const targetAmount = 1200;
      const startDate = new Date('2026-01-01');
      
      // Original plan: €200/month (6 months)
      const overrides = [
        { memberId: '1', amount: 50 }, // Member 1 contributes €50
        { memberId: '2', amount: 50 }, // Member 2 contributes €50
      ];
      // Total: €100/month -> Should take 12 months

      const projectedDate = calculateProjectedDate(targetAmount, startDate, overrides);
      
      const diffMonths = (projectedDate.getFullYear() - startDate.getFullYear()) * 12 + 
                        (projectedDate.getMonth() - startDate.getMonth());
      
      expect(diffMonths).toBe(12);
    });

    it('should handle zero total contributions by returning a very far date (or Infinity equivalent)', () => {
       const targetAmount = 1200;
       const startDate = new Date('2026-01-01');
       const projectedDate = calculateProjectedDate(targetAmount, startDate, []);
       expect(projectedDate.getFullYear()).toBe(9999);
    });
  });
});
