import { describe, it, expect } from "vitest";
import {
  calculateIncomeShares,
  calculateCategoryBalances,
  MemberIncome,
} from "../../_src/services/calculation";

describe("Income Share Calculation", () => {
  it("should calculate proportional shares for a simple group", () => {
    const members: MemberIncome[] = [
      { id: "1", income: 2000 },
      { id: "2", income: 1000 },
    ];
    const shares = calculateIncomeShares(members);

    expect(shares.find((s) => s.id === "1")?.share).toBe(0.67);
    expect(shares.find((s) => s.id === "2")?.share).toBe(0.33);
    // Sum in tenth-integer space: 1dp floats never sum to exactly 100 in IEEE754.
    expect(
      shares.reduce((acc, s) => acc + Math.round(s.percentage * 10), 0),
    ).toBe(1000);
  });

  it("should absorb rounding remainder by the highest earner", () => {
    // 100 / 3 = 33.333...
    const members: MemberIncome[] = [
      { id: "1", income: 1000 },
      { id: "2", income: 1000 },
      { id: "3", income: 1000 },
    ];
    const shares = calculateIncomeShares(members);

    // Total is exactly 100.0 at 1dp (issue #128). Each is 33.3%; the leftover
    // 0.1 goes to one member (largest-remainder, stable tiebreak) → 33.4.
    const totalTenths = shares.reduce(
      (acc, s) => acc + Math.round(s.percentage * 10),
      0,
    );
    expect(totalTenths).toBe(1000);

    const individualPercentages = shares.map((s) => s.percentage);
    expect(individualPercentages).toContain(33.4);
    expect(individualPercentages.filter((s) => s === 33.3).length).toBe(2);
  });

  it("allocates the percentage remainder to the largest remainder, summing to 100.0", () => {
    // 2000/1750/1750: corrected largest-remainder math. A holds the largest
    // grid-remainder (.636) so A absorbs the +0.1 → 36.4/31.8/31.8 (NOT the
    // 36.3/31.9/31.8 the PRD example wrongly claimed).
    const members: MemberIncome[] = [
      { id: "1", income: 2000 },
      { id: "2", income: 1750 },
      { id: "3", income: 1750 },
    ];
    const shares = calculateIncomeShares(members);
    expect(shares.map((s) => s.percentage)).toEqual([36.4, 31.8, 31.8]);
    expect(
      shares.reduce((acc, s) => acc + Math.round(s.percentage * 10), 0),
    ).toBe(1000);
  });

  it("gives the leftover to a non-highest member via tiebreak (5032/2484/2484)", () => {
    const members: MemberIncome[] = [
      { id: "1", income: 5032 },
      { id: "2", income: 2484 },
      { id: "3", income: 2484 },
    ];
    const shares = calculateIncomeShares(members);
    // B (idx1, NOT the highest weight) absorbs the +0.1 by stable order.
    expect(shares.map((s) => s.percentage)).toEqual([50.3, 24.9, 24.8]);
    expect(
      shares.reduce((acc, s) => acc + Math.round(s.percentage * 10), 0),
    ).toBe(1000);
  });

  it("should handle zero total income by giving equal shares", () => {
    const members: MemberIncome[] = [
      { id: "1", income: 0 },
      { id: "2", income: 0 },
    ];
    const shares = calculateIncomeShares(members);
    expect(shares.find((s) => s.id === "1")?.percentage).toBe(50);
    expect(shares.find((s) => s.id === "2")?.percentage).toBe(50);
  });

  it("should handle retroactive mid-month income updates by applying latest shares to all expenses", () => {
    const initialMembers: MemberIncome[] = [
      { id: "1", income: 1000 },
      { id: "2", income: 1000 },
    ];
    let shares = calculateIncomeShares(initialMembers);
    expect(shares.find((s) => s.id === "1")?.percentage).toBe(50);

    const expenses = [
      { payerId: "1", amount: 100 },
      { payerId: "2", amount: 100 },
    ];

    let balances = calculateCategoryBalances(
      { monthlyBudget: 400 },
      shares.map((s) => ({ id: s.id, share: s.share })),
      expenses,
    );
    expect(balances.find((b) => b.memberId === "1")?.remainingQuota).toBe(100); // 200 - 100

    // Mid-month update: member 1 income increases
    const updatedMembers: MemberIncome[] = [
      { id: "1", income: 3000 },
      { id: "2", income: 1000 },
    ];
    shares = calculateIncomeShares(updatedMembers);
    expect(shares.find((s) => s.id === "1")?.percentage).toBe(75);

    // Re-calculate balances with NEW shares but SAME expenses
    balances = calculateCategoryBalances(
      { monthlyBudget: 400 },
      shares.map((s) => ({ id: s.id, share: s.share })),
      expenses,
    );
    expect(balances.find((b) => b.memberId === "1")?.remainingQuota).toBe(200); // 300 - 100
    expect(balances.find((b) => b.memberId === "2")?.remainingQuota).toBe(0); // 100 - 100
  });
});
