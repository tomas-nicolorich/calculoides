import { describe, it, expect } from "vitest";
import { diffContributionPersistence } from "./contributionDiff";
import type { ContributionBreakdown } from "./index";

function member(
  overrides: Partial<ContributionBreakdown> & { memberId: string },
): ContributionBreakdown {
  return {
    share: 0.5,
    percentage: 50,
    proportionalAmount: 100,
    actualAmount: 100,
    isOverridden: false,
    remainingBalance: 1000,
    ...overrides,
  };
}

describe("diffContributionPersistence", () => {
  it("excludes an untouched member (not in overrideAmounts, not previously overridden) from both toUpsert and toDelete", () => {
    const breakdown = [member({ memberId: "a", isOverridden: false })];
    const { toUpsert, toDelete } = diffContributionPersistence(breakdown, {});

    expect(toUpsert).toEqual([]);
    expect(toDelete).toEqual([]);
  });

  it("upserts an explicitly edited member present in overrideAmounts", () => {
    const breakdown = [member({ memberId: "b", isOverridden: false })];
    const { toUpsert, toDelete } = diffContributionPersistence(breakdown, {
      b: 250,
    });

    expect(toUpsert).toEqual([{ memberId: "b", amount: 250 }]);
    expect(toDelete).toEqual([]);
  });

  it("deletes a member whose override was reset (was isOverridden, now absent from overrideAmounts)", () => {
    const breakdown = [member({ memberId: "c", isOverridden: true })];
    const { toUpsert, toDelete } = diffContributionPersistence(breakdown, {});

    expect(toUpsert).toEqual([]);
    expect(toDelete).toEqual(["c"]);
  });

  it("upserts (not deletes) a member whose reset was undone and restored to overrideAmounts", () => {
    const breakdown = [member({ memberId: "d", isOverridden: true })];
    const { toUpsert, toDelete } = diffContributionPersistence(breakdown, {
      d: 300,
    });

    expect(toUpsert).toEqual([{ memberId: "d", amount: 300 }]);
    expect(toDelete).toEqual([]);
  });

  it("does not delete a reset member that had no pre-existing override row", () => {
    const breakdown = [member({ memberId: "e", isOverridden: false })];
    const { toUpsert, toDelete } = diffContributionPersistence(breakdown, {});

    expect(toDelete).not.toContain("e");
    expect(toUpsert).toEqual([]);
  });

  it("handles a mixed breakdown: untouched, edited, reset, and undone members independently", () => {
    const breakdown = [
      member({ memberId: "untouched", isOverridden: false }),
      member({ memberId: "edited", isOverridden: false }),
      member({ memberId: "reset", isOverridden: true }),
      member({ memberId: "undone", isOverridden: true }),
    ];
    const overrideAmounts = { edited: 120, undone: 80 };

    const { toUpsert, toDelete } = diffContributionPersistence(
      breakdown,
      overrideAmounts,
    );

    expect(toUpsert).toEqual(
      expect.arrayContaining([
        { memberId: "edited", amount: 120 },
        { memberId: "undone", amount: 80 },
      ]),
    );
    expect(toUpsert).toHaveLength(2);
    expect(toDelete).toEqual(["reset"]);
  });
});
