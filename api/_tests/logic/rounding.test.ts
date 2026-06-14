import { describe, it, expect } from "vitest";
import { calculateRoundedShares } from "../../../shared/logic/rounding";

describe("calculateRoundedShares", () => {
  it("should calculate proportional shares correctly", () => {
    const members = [
      { id: "1", income: 2000 },
      { id: "2", income: 1000 },
    ];
    const result = calculateRoundedShares(members);

    expect(result).toHaveLength(2);
    expect(result.find((s) => s.id === "1")?.percentage).toBe(66.67);
    expect(result.find((s) => s.id === "2")?.percentage).toBe(33.33);
    expect(result.reduce((sum, s) => sum + s.percentage, 0)).toBe(100);
    expect(result.reduce((sum, s) => sum + s.share, 0)).toBe(1);
  });

  it("should have the highest income member absorb the remainder", () => {
    // 100 / 3 = 33.3333...
    const members = [
      { id: "1", income: 100 },
      { id: "2", income: 100 },
      { id: "3", income: 100 },
    ];
    const result = calculateRoundedShares(members);

    const totalPercentage = result.reduce((sum, s) => sum + s.percentage, 0);
    const totalShare = result.reduce((sum, s) => sum + s.share, 0);

    expect(totalPercentage).toBe(100);
    expect(totalShare).toBe(1);

    // One member should have 33.34 and 0.34
    const specialized = result.filter((s) => s.percentage === 33.34);
    expect(specialized).toHaveLength(1);
  });

  it("should handle zero total income", () => {
    const members = [
      { id: "1", income: 0 },
      { id: "2", income: 0 },
    ];
    const result = calculateRoundedShares(members);

    expect(result.reduce((sum, s) => sum + s.percentage, 0)).toBe(100);
    expect(result[0].percentage).toBe(50);
    expect(result[1].percentage).toBe(50);
  });

  it("should handle single member", () => {
    const members = [{ id: "1", income: 500 }];
    const result = calculateRoundedShares(members);

    expect(result[0].percentage).toBe(100);
    expect(result[0].share).toBe(1);
  });
});
