import { describe, it, expect } from "vitest";
import { calculateCategoryBalances } from "../../_src/services/calculation";

/** Sum quotas in integer-cent space; avoids lossy float `=== budget`. */
function quotaCents(balances: { quota: number }[]): number {
  return balances.reduce((acc, b) => acc + Math.round(b.quota * 100), 0);
}

describe("Category Balance Calculation", () => {
  it("distributes the budget by income with 2dp quotas summing exactly to the budget", () => {
    const members = [
      { id: "m1", income: 2000 },
      { id: "m2", income: 1000 },
    ];
    const category = { monthlyBudget: 1000 };

    const balances = calculateCategoryBalances(category, members, []);

    const m1 = balances.find((b) => b.memberId === "m1");
    const m2 = balances.find((b) => b.memberId === "m2");
    // 2/3 vs 1/3 of 1000 → 666.67 / 333.33 (cent-allocated, exact foot).
    expect(m1?.quota).toBe(666.67);
    expect(m2?.quota).toBe(333.33);
    // Each quota is 2dp.
    for (const b of balances) {
      expect(Number.isInteger(Math.round(b.quota * 100))).toBe(true);
    }
    // Integer-cent foot: Σ cents === budget cents (NOT lossy float compare).
    expect(quotaCents(balances)).toBe(Math.round(category.monthlyBudget * 100));
  });

  it("quotas sum exactly to budget even when 1dp percentages would not foot (decoupled from rounded %)", () => {
    // Equal-ish incomes where naive `round(%)·budget` leaks cents.
    const members = [
      { id: "m1", income: 2000 },
      { id: "m2", income: 1750 },
      { id: "m3", income: 1750 },
    ];
    const category = { monthlyBudget: 100 };

    const balances = calculateCategoryBalances(category, members, []);

    expect(quotaCents(balances)).toBe(10000); // exactly €100.00
    // Quota comes from precise income weights: highest earner gets the largest quota.
    const m1 = balances.find((b) => b.memberId === "m1");
    const m2 = balances.find((b) => b.memberId === "m2");
    if (!m1 || !m2) throw new Error("missing balance");
    expect(m1.quota).toBeGreaterThan(m2.quota);
    // Decoupling proof (PRD invariant): quota derives from the PRECISE income
    // share, the displayed percentage is rounded independently — so
    // `percentage × budget ≠ quota`, by design.
    // m1 precise share = 2000/5500 = 36.3636% → quota 36.36 (cent-allocated),
    // while the displayed 1dp percentage rounds to 36.4 (→ 36.40 if multiplied).
    expect(m1.quota).toBe(36.36);
    expect(m1.percentage).toBe(36.4);
    expect((m1.percentage / 100) * category.monthlyBudget).not.toBe(m1.quota);
  });

  it("excludes zero-income members from the allocation (flagged, zeroed)", () => {
    const members = [
      { id: "m1", income: 2000 },
      { id: "m2", income: 0 },
    ];
    const category = { monthlyBudget: 1000 };

    const balances = calculateCategoryBalances(category, members, []);

    const m1 = balances.find((b) => b.memberId === "m1");
    const m2 = balances.find((b) => b.memberId === "m2");
    if (!m1 || !m2) throw new Error("missing balance");
    // Zero-income member excluded: zeroed quota/percentage, flagged.
    expect(m2.excluded).toBe(true);
    expect(m2.quota).toBe(0);
    expect(m2.percentage).toBe(0);
    // Sole eligible member absorbs 100.0% and the whole budget.
    expect(m1.excluded).toBe(false);
    expect(m1.quota).toBe(1000);
    expect(m1.percentage).toBe(100);
    // Eligible set still foots exactly to the budget.
    expect(quotaCents(balances)).toBe(100000);
    // Eligible-set percentages still sum to exactly 100.0 (tenths space).
    const pctTenths = balances.reduce(
      (acc, b) => acc + Math.round(b.percentage * 10),
      0,
    );
    expect(pctTenths).toBe(1000);
  });

  it("marks every member excluded when the whole category has zero income (empty signal)", () => {
    const members = [
      { id: "m1", income: 0 },
      { id: "m2", income: 0 },
    ];
    const category = { monthlyBudget: 1000 };

    const balances = calculateCategoryBalances(category, members, []);

    // Empty-category signal at this seam: nobody eligible → all excluded, no quota.
    expect(balances.every((b) => b.excluded)).toBe(true);
    expect(balances.every((b) => b.quota === 0 && b.percentage === 0)).toBe(
      true,
    );
    expect(quotaCents(balances)).toBe(0);
  });

  it("gives a single eligible member 100% of the budget", () => {
    const members = [{ id: "m1", income: 5000 }];
    const category = { monthlyBudget: 500 };

    const balances = calculateCategoryBalances(category, members, []);

    expect(balances).toHaveLength(1);
    expect(balances[0].quota).toBe(500);
    expect(balances[0].spent).toBe(0);
    expect(balances[0].remainingQuota).toBe(500);
    expect(quotaCents(balances)).toBe(50000);
  });

  it("renormalizes over a restricted subset (caller passes only the subset's incomes)", () => {
    // Group has m1/m2/m3 but the category is restricted to m1+m2.
    const subset = [
      { id: "m1", income: 3000 },
      { id: "m2", income: 1000 },
    ];
    const category = { monthlyBudget: 800 };

    const balances = calculateCategoryBalances(category, subset, []);

    expect(balances.map((b) => b.memberId)).toEqual(["m1", "m2"]);
    // 3:1 split of 800 → 600 / 200, footing to the full budget.
    expect(balances.find((b) => b.memberId === "m1")?.quota).toBe(600);
    expect(balances.find((b) => b.memberId === "m2")?.quota).toBe(200);
    expect(quotaCents(balances)).toBe(80000);
  });

  it("is deterministic across repeated runs", () => {
    const members = [
      { id: "m1", income: 2000 },
      { id: "m2", income: 1750 },
      { id: "m3", income: 1750 },
    ];
    const category = { monthlyBudget: 333.33 };

    const a = calculateCategoryBalances(category, members, []);
    const b = calculateCategoryBalances(category, members, []);

    expect(a).toEqual(b);
    expect(quotaCents(a)).toBe(Math.round(category.monthlyBudget * 100));
  });

  it("exposes a 1dp percentage per member summing to exactly 100.0", () => {
    const members = [
      { id: "m1", income: 2000 },
      { id: "m2", income: 1750 },
      { id: "m3", income: 1750 },
    ];
    const category = { monthlyBudget: 1000 };

    const balances = calculateCategoryBalances(category, members, []);

    const pctTenths = balances.reduce(
      (acc, b) => acc + Math.round(b.percentage * 10),
      0,
    );
    expect(pctTenths).toBe(1000); // 100.0
    for (const b of balances) {
      // 1dp values only.
      expect(Math.round(b.percentage * 10)).toBe(b.percentage * 10);
    }
  });

  it("subtracts member expenses from the quota", () => {
    const members = [
      { id: "m1", income: 670 },
      { id: "m2", income: 330 },
    ];
    const category = { monthlyBudget: 1000 };
    const expenses = [
      { payerId: "m1", amount: 100 },
      { payerId: "m2", amount: 50 },
    ];

    const balances = calculateCategoryBalances(category, members, expenses);

    expect(balances.find((b) => b.memberId === "m1")?.remainingQuota).toBe(570);
    expect(balances.find((b) => b.memberId === "m2")?.remainingQuota).toBe(280);
  });

  it("reflects transfers while preserving the budget total (transfers are zero-sum)", () => {
    const members = [
      { id: "m1", income: 1000 },
      { id: "m2", income: 1000 },
    ];
    const category = { monthlyBudget: 1000 };
    const transfers = [{ fromMemberId: "m1", toMemberId: "m2", amount: 50 }];

    const balances = calculateCategoryBalances(
      category,
      members,
      [],
      transfers,
    );

    // 500/500 base, then 50 moved m1→m2.
    expect(balances.find((b) => b.memberId === "m1")?.remainingQuota).toBe(450);
    expect(balances.find((b) => b.memberId === "m2")?.remainingQuota).toBe(550);
    // Net quotas still foot to the budget.
    expect(quotaCents(balances)).toBe(100000);
  });
});
