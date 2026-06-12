import { describe, it, expect } from "vitest";
import { calculateSavingsContributions } from "../../src/services/savings";
import {
  calculateProjectedMonths,
  addMonths,
} from "../../../shared/logic/projection";

describe("Savings Logic", () => {
  describe("calculateSavingsContributions", () => {
    it("should calculate proportional monthly contributions based on income shares and starting amount", () => {
      const targetAmount = 1200;
      const currentAmount = 200; // 1000 left to save
      const targetDate = new Date();
      targetDate.setMonth(targetDate.getMonth() + 5); // 5 months away -> 200/month total

      const members = [
        { id: "1", share: 0.6 },
        { id: "2", share: 0.4 },
      ];

      const contributions = calculateSavingsContributions(
        targetAmount,
        currentAmount,
        targetDate,
        members,
      );

      expect(contributions).toHaveLength(2);
      expect(
        contributions.find((c) => c.memberId === "1")?.monthlyContribution,
      ).toBe(120);
      expect(
        contributions.find((c) => c.memberId === "2")?.monthlyContribution,
      ).toBe(80);
    });

    it("should handle zero members", () => {
      const targetAmount = 1000;
      const currentAmount = 0;
      const targetDate = new Date();
      targetDate.setMonth(targetDate.getMonth() + 10);

      const contributions = calculateSavingsContributions(
        targetAmount,
        currentAmount,
        targetDate,
        [],
      );
      expect(contributions).toHaveLength(0);
    });

    it("should handle goal already reached", () => {
      const targetAmount = 1000;
      const currentAmount = 1500;
      const targetDate = new Date();
      targetDate.setMonth(targetDate.getMonth() + 10);

      const contributions = calculateSavingsContributions(
        targetAmount,
        currentAmount,
        targetDate,
        [{ id: "1", share: 1 }],
      );
      expect(contributions[0].monthlyContribution).toBe(0);
    });
  });

  describe("calculateProjectedMonths + addMonths (migration of BUG-035, BUG-036)", () => {
    it("should calculate projected months and date for normal contributions", () => {
      const months = calculateProjectedMonths(1200, 200, 100); // 1000 left / 100/month = 10
      expect(months).toBe(10);
      const startDate = new Date("2026-01-01");
      const projectedDate = addMonths(startDate, months);
      const diffMonths =
        (projectedDate.getFullYear() - startDate.getFullYear()) * 12 +
        (projectedDate.getMonth() - startDate.getMonth());
      expect(diffMonths).toBe(10);
    });

    it("should return Infinity months and +100yr date for zero contributions (BUG-035)", () => {
      const months = calculateProjectedMonths(1000, 0, 0);
      expect(months).toBe(Infinity);
      const date = addMonths(new Date("2026-01-01"), months);
      expect(date.getFullYear()).toBe(2126);
      expect(date.getTime()).toBeGreaterThan(0);
    });

    it("should return Infinity months and +100yr date for negative contributions (BUG-035)", () => {
      const months = calculateProjectedMonths(1000, 0, -100);
      expect(months).toBe(Infinity);
      const date = addMonths(new Date("2026-05-12"), months);
      expect(date.getFullYear()).toBe(2126);
      expect(date.getTime()).toBeGreaterThan(0);
    });

    it("should return a valid future date for 100/month toward 1000 goal (BUG-036)", () => {
      const months = calculateProjectedMonths(1000, 0, 100); // 10 months
      const startDate = new Date("2026-06-03");
      const projectedDate = addMonths(startDate, months);
      expect(projectedDate).toBeDefined();
      expect(projectedDate instanceof Date).toBe(true);
      expect(projectedDate.getTime()).toBeGreaterThan(0);
      const diffMonths =
        (projectedDate.getFullYear() - startDate.getFullYear()) * 12 +
        (projectedDate.getMonth() - startDate.getMonth());
      expect(diffMonths).toBe(10);
    });
  });
});
