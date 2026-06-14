import { describe, it, expect } from "vitest";
import { calculateCategoryBalances } from "../../_src/services/calculation";

describe("Transfer Logic", () => {
  const category = { monthlyBudget: 1000 };
  const members = [
    { id: "1", share: 0.5 }, // €500 quota
    { id: "2", share: 0.5 }, // €500 quota
  ];
  const expenses: { payerId: string; amount: number }[] = [];

  let m1: ReturnType<typeof calculateCategoryBalances>[number] | undefined;
  let m2: ReturnType<typeof calculateCategoryBalances>[number] | undefined;

  function computeBalances(
    transfers: { fromMemberId: string; toMemberId: string; amount: number }[],
  ) {
    const balances = calculateCategoryBalances(
      category,
      members,
      expenses,
      transfers,
    );
    m1 = balances.find((b) => b.memberId === "1");
    m2 = balances.find((b) => b.memberId === "2");
  }

  it("should adjust individual quotas based on transfers", () => {
    computeBalances([{ fromMemberId: "1", toMemberId: "2", amount: 100 }]);
    expect(m1?.totalQuota).toBe(400); // 500 - 100
    expect(m2?.totalQuota).toBe(600); // 500 + 100
  });

  it("should handle multiple transfers", () => {
    computeBalances([
      { fromMemberId: "1", toMemberId: "2", amount: 100 },
      { fromMemberId: "2", toMemberId: "1", amount: 50 },
    ]);
    expect(m1?.totalQuota).toBe(450); // 500 - 100 + 50
    expect(m2?.totalQuota).toBe(550); // 500 + 100 - 50
  });
});
