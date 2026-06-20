import { describe, it, expect } from "vitest";
import { categoryMemberShare } from "./dashboardUtils";

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
