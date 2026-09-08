import { describe, it, expect } from "vitest";
import { diffContributionPersistence } from "./contribution-diff";
import type { SavingsContributionBreakdown } from "../app/_data/savings";

/**
 * Ported verbatim from `main`'s
 * `frontend/src/entities/savings-goal/contributionDiff.test.ts` (PR 16).
 * Genuine RED before this file existed — module not found.
 */
function breakdownItem(
  overrides: Partial<SavingsContributionBreakdown> & { memberId: string },
): SavingsContributionBreakdown {
  return {
    share: 1,
    percentage: 50,
    proportionalAmount: 100,
    actualAmount: 100,
    isOverridden: false,
    remainingBalance: 500,
    ...overrides,
  };
}

describe("diffContributionPersistence", () => {
  it("upserts a member present in overrideAmounts, whether newly edited or undo-restored", () => {
    const breakdown = [breakdownItem({ memberId: "m1" })];
    const { toUpsert, toDelete } = diffContributionPersistence(breakdown, {
      m1: 150,
    });

    expect(toUpsert).toEqual([{ memberId: "m1", amount: 150 }]);
    expect(toDelete).toEqual([]);
  });

  it("deletes a member absent from overrideAmounts who WAS overridden", () => {
    const breakdown = [
      breakdownItem({ memberId: "m1", isOverridden: true, actualAmount: 200 }),
    ];
    const { toUpsert, toDelete } = diffContributionPersistence(breakdown, {});

    expect(toUpsert).toEqual([]);
    expect(toDelete).toEqual(["m1"]);
  });

  it("leaves a member absent from overrideAmounts who was never overridden untouched", () => {
    const breakdown = [breakdownItem({ memberId: "m1", isOverridden: false })];
    const { toUpsert, toDelete } = diffContributionPersistence(breakdown, {});

    expect(toUpsert).toEqual([]);
    expect(toDelete).toEqual([]);
  });

  it("handles a mix of upsert/delete/untouched members in one breakdown", () => {
    const breakdown = [
      breakdownItem({ memberId: "upsert-me" }),
      breakdownItem({
        memberId: "delete-me",
        isOverridden: true,
        actualAmount: 300,
      }),
      breakdownItem({ memberId: "untouched" }),
    ];
    const { toUpsert, toDelete } = diffContributionPersistence(breakdown, {
      "upsert-me": 75,
    });

    expect(toUpsert).toEqual([{ memberId: "upsert-me", amount: 75 }]);
    expect(toDelete).toEqual(["delete-me"]);
  });
});
