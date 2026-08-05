import { describe, it, expect } from "vitest";
import { calculateSavingsContributions } from "../../../lib/server/services/savings";
import { calculateMemberBudgetedTotals } from "../../../lib/server/services/calculation";
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

    it("should derive monthlyContribution from percentage (finer precision) instead of the coarser share, when both are present (issue #160)", () => {
      const targetAmount = 1200;
      const currentAmount = 200; // 1000 left to save
      const targetDate = new Date();
      targetDate.setDate(1); // anchor to day=1 to avoid month-rollover flakiness
      targetDate.setMonth(targetDate.getMonth() + 5); // raw diff 5 -> corrected 4 months -> 250/month total

      const members = [
        { id: "1", share: 0.29, percentage: 29.1 },
        { id: "2", share: 0.71, percentage: 70.9 },
      ];

      const contributions = calculateSavingsContributions(
        targetAmount,
        currentAmount,
        targetDate,
        members,
      );

      expect(contributions).toHaveLength(2);
      // Percentage-derived weights (0.291 / 0.709) applied to 250/month total:
      // 250 * 0.291 = 72.75, 250 * 0.709 = 177.25 (sums exactly, no remainder).
      // The coarser share-only math (0.29 / 0.71) would instead yield 72.5/177.5.
      expect(
        contributions.find((c) => c.memberId === "1")?.monthlyContribution,
      ).toBe(72.75);
      expect(
        contributions.find((c) => c.memberId === "2")?.monthlyContribution,
      ).toBe(177.25);
    });

    it("reconciles the exact issue #160 repro: displayed percentage and computed dollar amount must match", () => {
      const targetAmount = 1000;
      const currentAmount = 0;
      const targetDate = new Date();
      targetDate.setDate(1);
      targetDate.setMonth(targetDate.getMonth() + 1); // rawDiff 1 -> corrected 0 -> lump sum of totalMonthlyNeed

      const totalMonthlyNeed = 1000;
      const members = [
        { id: "1", share: 0.29, percentage: 29.1 },
        { id: "2", share: 0.71, percentage: 70.9 },
      ];

      const contributions = calculateSavingsContributions(
        targetAmount,
        currentAmount,
        targetDate,
        members,
      );

      const member1 = contributions.find((c) => c.memberId === "1");
      const member2 = contributions.find((c) => c.memberId === "2");

      expect(member1?.monthlyContribution).toBe(291.0);
      expect(member2?.monthlyContribution).toBe(709.0);

      // Reconciliation invariant: dollar amount / total must equal percentage / 100
      // within a one-cent tolerance.
      for (const member of [
        { contribution: member1, percentage: 29.1 },
        { contribution: member2, percentage: 70.9 },
      ]) {
        const impliedPercentage =
          ((member.contribution?.monthlyContribution ?? 0) / totalMonthlyNeed) *
          100;
        expect(
          Math.abs(impliedPercentage - member.percentage),
        ).toBeLessThanOrEqual(0.1);
      }

      // Exact-sum invariant: contributions still sum exactly to the goal's
      // monthly need (remainder-absorption preserved).
      const sum = contributions.reduce(
        (acc, c) => Number((acc + c.monthlyContribution).toFixed(2)),
        0,
      );
      expect(sum).toBe(totalMonthlyNeed);
    });

    it("absorbs a genuine non-zero cent remainder onto the highest-share member when percentage-derived weights do not divide evenly", () => {
      // A 3-member split whose per-member floored dollar amounts leave a
      // real leftover: 333.33 * [0.202, 0.333, 0.465] floors to
      // [67.33, 110.99, 154.99], which sums to 333.31 — 2 cents short of
      // the 333.33 total. This genuinely exercises the `remainder !== 0`
      // branch in calculateSavingsContributions (unlike the other tests in
      // this file, whose percentage splits happen to divide evenly).
      const targetAmount = 333.33;
      const currentAmount = 0;
      const targetDate = new Date(); // same month as "now" -> lump sum, totalMonthlyNeed = 333.33

      const members = [
        { id: "1", share: 0.202, percentage: 20.2 },
        { id: "2", share: 0.333, percentage: 33.3 },
        { id: "3", share: 0.465, percentage: 46.5 }, // highest share -> absorbs the remainder
      ];

      const contributions = calculateSavingsContributions(
        targetAmount,
        currentAmount,
        targetDate,
        members,
      );

      const member1 = contributions.find((c) => c.memberId === "1");
      const member2 = contributions.find((c) => c.memberId === "2");
      const member3 = contributions.find((c) => c.memberId === "3");

      // Naive floored amounts (67.33 / 110.99 / 154.99) are what each
      // member would get WITHOUT remainder absorption. Member 3's actual
      // value must be 0.02 higher than that naive floor, proving the
      // leftover 2 cents were absorbed onto the highest-share member.
      expect(member1?.monthlyContribution).toBe(67.33);
      expect(member2?.monthlyContribution).toBe(110.99);
      expect(member3?.monthlyContribution).toBe(155.01); // 154.99 + 0.02 remainder

      // Exact-sum invariant: even with a non-zero remainder, the total
      // still reconciles exactly to the goal's monthly need.
      const sum = contributions.reduce(
        (acc, c) => Number((acc + c.monthlyContribution).toFixed(2)),
        0,
      );
      expect(sum).toBe(targetAmount);
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
