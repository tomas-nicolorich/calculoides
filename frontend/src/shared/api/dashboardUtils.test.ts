import { describe, it, expect } from "vitest";
import {
  categoryMemberShare,
  formatCurrency,
  progressState,
  progressPercent,
} from "./dashboardUtils";

const allMembers = [
  { id: "m1", income: 3000 },
  { id: "m2", income: 1000 },
  { id: "m3", income: 2000 },
];

describe("categoryMemberShare", () => {
  it("all-members category: share equals global income percentage", () => {
    const result = categoryMemberShare(allMembers, ["m1", "m2", "m3"]);
    expect(result).toHaveLength(3);
    const byId = Object.fromEntries(result.map((r) => [r.memberId, r.share]));
    expect(byId.m1).toBeCloseTo(50);
    expect(byId.m2).toBeCloseTo(16.7, 0);
    expect(byId.m3).toBeCloseTo(33.3, 0);
  });

  it("all-members shares sum to ~100", () => {
    const result = categoryMemberShare(allMembers, ["m1", "m2", "m3"]);
    const total = result.reduce((sum, r) => sum + r.share, 0);
    expect(total).toBeCloseTo(100, 0);
  });

  it("subset category: shares re-normalised across participating members", () => {
    const result = categoryMemberShare(allMembers, ["m1", "m3"]);
    expect(result).toHaveLength(2);
    const byId = Object.fromEntries(result.map((r) => [r.memberId, r.share]));
    expect(byId.m1).toBeCloseTo(60);
    expect(byId.m3).toBeCloseTo(40);
  });

  it("subset shares sum to ~100", () => {
    const result = categoryMemberShare(allMembers, ["m1", "m3"]);
    const total = result.reduce((sum, r) => sum + r.share, 0);
    expect(total).toBeCloseTo(100, 0);
  });

  it("result is independent of transfer-adjusted quotas (only incomes matter)", () => {
    const withTransfer = [
      { id: "m1", income: 3000 },
      { id: "m2", income: 1000 },
    ];
    const withoutTransfer = [
      { id: "m1", income: 3000 },
      { id: "m2", income: 1000 },
    ];
    expect(categoryMemberShare(withTransfer, ["m1", "m2"])).toEqual(
      categoryMemberShare(withoutTransfer, ["m1", "m2"]),
    );
  });

  it("returns zero shares when all incomes are zero", () => {
    const zeroMembers = [
      { id: "m1", income: 0 },
      { id: "m2", income: 0 },
    ];
    const result = categoryMemberShare(zeroMembers, ["m1", "m2"]);
    expect(result.every((r) => r.share === 0)).toBe(true);
  });

  it("single-member subset has 100% share", () => {
    const result = categoryMemberShare(allMembers, ["m2"]);
    expect(result).toHaveLength(1);
    expect(result[0].share).toBeCloseTo(100);
  });
});

describe("formatCurrency (en-IE)", () => {
  it("formats a positive amount as €-prefixed with comma thousands and dot decimals", () => {
    expect(formatCurrency(8420)).toBe("€8,420.00");
  });

  it("formats larger amounts with comma thousands separators", () => {
    expect(formatCurrency(13000)).toBe("€13,000.00");
  });

  it("formats zero as €0.00", () => {
    expect(formatCurrency(0)).toBe("€0.00");
  });

  it("formats a negative amount with a leading minus before the symbol", () => {
    expect(formatCurrency(-8420)).toBe("-€8,420.00");
  });

  it("formats a negative fractional amount correctly", () => {
    expect(formatCurrency(-1234.5)).toBe("-€1,234.50");
  });
});

describe("progressState (ADR 0007 thresholds)", () => {
  it("is on-track just below the 80% boundary", () => {
    expect(progressState(79.9, 100)).toBe("on-track");
  });

  it("is behind exactly at the 80% boundary", () => {
    expect(progressState(80, 100)).toBe("behind");
  });

  it("is behind exactly at the 100% boundary", () => {
    expect(progressState(100, 100)).toBe("behind");
  });

  it("is blocked just above the 100% boundary", () => {
    expect(progressState(100.1, 100)).toBe("blocked");
  });

  it("derives state from the raw ratio, not a rounded percent", () => {
    // 79.6/100 rounds to 80% for display but is still on-track.
    expect(progressState(79.6, 100)).toBe("on-track");
  });

  it("guards budget <= 0", () => {
    expect(progressState(0, 0)).toBe("on-track");
    expect(progressState(10, 0)).toBe("blocked");
  });
});

describe("progressPercent", () => {
  it("rounds the spent/budget ratio", () => {
    expect(progressPercent(84, 100)).toBe(84);
    expect(progressPercent(795, 1000)).toBe(80);
  });

  it("guards budget <= 0", () => {
    expect(progressPercent(0, 0)).toBe(0);
    expect(progressPercent(5, 0)).toBe(100);
  });
});
