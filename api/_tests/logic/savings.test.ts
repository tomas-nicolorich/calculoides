import { describe, it, expect } from "vitest";
import { calculateSavingsContributions } from "../../_src/services/savings";
import { calculateMemberBudgetedTotals } from "../../_src/services/calculation";
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
      targetDate.setDate(1); // anchor to day=1 to avoid month-rollover flakiness
      targetDate.setMonth(targetDate.getMonth() + 5); // raw diff 5 -> corrected 4 months -> 250/month total

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
      ).toBe(150);
      expect(
        contributions.find((c) => c.memberId === "2")?.monthlyContribution,
      ).toBe(100);
    });

    it("should fall back to lump-sum when the target date is exactly one calendar month out", () => {
      const targetAmount = 1200;
      const currentAmount = 200; // 1000 left to save
      const targetDate = new Date();
      targetDate.setDate(1);
      targetDate.setMonth(targetDate.getMonth() + 1); // rawDiff 1 -> corrected 0 -> lump sum

      const contributions = calculateSavingsContributions(
        targetAmount,
        currentAmount,
        targetDate,
        [{ id: "1", share: 1 }],
      );

      expect(contributions[0].monthlyContribution).toBe(1000);
    });

    it("should fall back to lump-sum when the target date is within the current month", () => {
      const targetAmount = 1200;
      const currentAmount = 200; // 1000 left to save
      const targetDate = new Date(); // same month as "now" -> corrected -1 -> lump sum

      const contributions = calculateSavingsContributions(
        targetAmount,
        currentAmount,
        targetDate,
        [{ id: "1", share: 1 }],
      );

      expect(contributions[0].monthlyContribution).toBe(1000);
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

  describe("calculateMemberBudgetedTotals (Per-Member Affordability Ceiling Exposure)", () => {
    it("returns budgeted 0 for every member when there are no categories, so ceiling equals income", () => {
      const members = [
        { id: "1", income: 1000 },
        { id: "2", income: 500 },
      ];

      const result = calculateMemberBudgetedTotals(members, [], [], []);

      expect(result).toHaveLength(2);
      expect(result.find((r) => r.memberId === "1")?.budgeted).toBe(0);
      expect(result.find((r) => r.memberId === "2")?.budgeted).toBe(0);
    });

    it("only budgets members linked to a restricted category, excluding the rest", () => {
      const members = [
        { id: "1", income: 600 },
        { id: "2", income: 400 },
      ];
      const categories = [
        {
          id: "cat-1",
          monthlyBudget: 100,
          memberLinks: [{ memberId: "1" }],
        },
      ];

      const result = calculateMemberBudgetedTotals(members, categories, [], []);

      expect(result.find((r) => r.memberId === "1")?.budgeted).toBe(100);
      expect(result.find((r) => r.memberId === "2")?.budgeted).toBe(0);
    });

    it("excludes a zero-income member from the category allocation", () => {
      const members = [
        { id: "1", income: 1000 },
        { id: "2", income: 0 },
      ];
      const categories = [{ id: "cat-1", monthlyBudget: 200, memberLinks: [] }];

      const result = calculateMemberBudgetedTotals(members, categories, [], []);

      expect(result.find((r) => r.memberId === "1")?.budgeted).toBe(200);
      expect(result.find((r) => r.memberId === "2")?.budgeted).toBe(0);
    });

    it("produces a negative ceiling (income - budgeted) when the sole eligible member is over-budget", () => {
      const members = [{ id: "1", income: 100 }];
      const categories = [{ id: "cat-1", monthlyBudget: 500, memberLinks: [] }];

      const result = calculateMemberBudgetedTotals(members, categories, [], []);
      const entry = result.find((r) => r.memberId === "1");

      expect(entry?.budgeted).toBe(500);
      const ceiling = members[0].income - (entry?.budgeted ?? 0);
      expect(ceiling).toBe(-400);
    });

    it("shifts each member's budgeted total by transfers on the category", () => {
      const members = [
        { id: "1", income: 600 },
        { id: "2", income: 400 },
      ];
      const categories = [{ id: "cat-1", monthlyBudget: 100, memberLinks: [] }];
      const transfers = [
        { categoryId: "cat-1", fromMemberId: "1", toMemberId: "2", amount: 20 },
      ];

      const result = calculateMemberBudgetedTotals(
        members,
        categories,
        [],
        transfers,
      );

      expect(result.find((r) => r.memberId === "1")?.budgeted).toBe(40); // 60 - 20
      expect(result.find((r) => r.memberId === "2")?.budgeted).toBe(60); // 40 + 20
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
