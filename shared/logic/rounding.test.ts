import { describe, it, expect } from "vitest";
import { calculateRoundedShares, largestRemainderAllocate } from "./rounding";

const sum = (xs: number[]) => Number(xs.reduce((a, b) => a + b, 0).toFixed(10));

describe("largestRemainderAllocate", () => {
  it("percentages: distributes to 1dp summing to exactly 100.0", () => {
    const result = largestRemainderAllocate([2000, 1000], 100, 0.1);
    expect(sum(result)).toBe(100);
    result.forEach((v) => {
      expect(Number((v * 10).toFixed(0)) / 10).toBe(v);
    });
  });

  it("worked example (corrected math): 2000/1750/1750 -> 36.4/31.8/31.8", () => {
    // NOTE: the PRD/design-doc worked example claims 36.3/31.9/31.8, but that
    // relies on a transposed fractional part (B .818 vs the correct .182).
    // Correct largest-remainder gives A (highest remainder .636) the +0.1.
    const result = largestRemainderAllocate([2000, 1750, 1750], 100, 0.1);
    expect(result).toEqual([36.4, 31.8, 31.8]);
    expect(sum(result)).toBe(100);
  });

  it("non-highest member absorbs leftover via tiebreak (author intent)", () => {
    // 5032/2484/2484: B/C share the largest remainder over A; B (idx1, NOT the
    // highest weight) gets the +0.1 by stable order. Demonstrates the pivot
    // away from "highest always absorbs".
    const result = largestRemainderAllocate([5032, 2484, 2484], 100, 0.1);
    expect(result).toEqual([50.3, 24.9, 24.8]);
    expect(sum(result)).toBe(100);
  });

  it("fully-equal weights: deterministic, stable-order tiebreak, sums to 100.0", () => {
    const a = largestRemainderAllocate([100, 100, 100], 100, 0.1);
    const b = largestRemainderAllocate([100, 100, 100], 100, 0.1);
    expect(a).toEqual(b); // determinism across runs
    expect(a).toEqual([33.4, 33.3, 33.3]); // first member absorbs
    expect(sum(a)).toBe(100);
  });

  it("money: cents quantum sums exactly to the category budget", () => {
    const result = largestRemainderAllocate([2000, 1750, 1750], 250.5, 0.01);
    expect(sum(result)).toBe(250.5);
    expect(result).toEqual([91.09, 79.71, 79.7]);
  });

  it("single member gets the whole total", () => {
    expect(largestRemainderAllocate([1234], 100, 0.1)).toEqual([100]);
    expect(largestRemainderAllocate([1234], 250.5, 0.01)).toEqual([250.5]);
  });

  it("all-zero weights fall back to an equal split that still sums to total", () => {
    const result = largestRemainderAllocate([0, 0, 0], 100, 0.1);
    expect(sum(result)).toBe(100);
    expect(result).toEqual([33.4, 33.3, 33.3]);
  });

  it("explicit tiebreak keys order the leftover deterministically", () => {
    // Equal weights & remainders; tiebreak picks the lowest key.
    const result = largestRemainderAllocate([100, 100, 100], 100, 0.1, [
      "c",
      "a",
      "b",
    ]);
    expect(result).toEqual([33.3, 33.4, 33.3]); // key "a" (idx1) absorbs
    expect(sum(result)).toBe(100);
  });

  it("empty input returns empty", () => {
    expect(largestRemainderAllocate([], 100, 0.1)).toEqual([]);
  });
});

describe("calculateRoundedShares", () => {
  it("should calculate proportional shares correctly", () => {
    const members = [
      { id: "1", income: 2000 },
      { id: "2", income: 1000 },
    ];
    const result = calculateRoundedShares(members);

    expect(result).toHaveLength(2);
    // percentage is now 1dp (issue #128); share stays 2dp.
    expect(result.find((s) => s.id === "1")?.percentage).toBe(66.7);
    expect(result.find((s) => s.id === "2")?.percentage).toBe(33.3);
    // 1dp/2dp floats never sum to exactly 100/1 in IEEE754 — sum in integer space.
    expect(
      result.reduce((sum, s) => sum + Math.round(s.percentage * 10), 0),
    ).toBe(1000);
    expect(result.reduce((sum, s) => sum + Math.round(s.share * 100), 0)).toBe(
      100,
    );
  });

  it("distributes the percentage remainder by largest remainder (1dp, sums 100.0)", () => {
    // 100 / 3 = 33.3333...; floored 1dp = 33.3 each (sum 99.9), +0.1 to the
    // first member by stable tiebreak (equal weights/remainders).
    const members = [
      { id: "1", income: 100 },
      { id: "2", income: 100 },
      { id: "3", income: 100 },
    ];
    const result = calculateRoundedShares(members);

    const totalTenths = result.reduce(
      (sum, s) => sum + Math.round(s.percentage * 10),
      0,
    );
    const totalCents = result.reduce(
      (sum, s) => sum + Math.round(s.share * 100),
      0,
    );

    expect(totalTenths).toBe(1000);
    expect(totalCents).toBe(100);

    // Exactly one member carries the +0.1 → 33.4; the rest are 33.3.
    expect(result.filter((s) => s.percentage === 33.4)).toHaveLength(1);
    expect(result.filter((s) => s.percentage === 33.3)).toHaveLength(2);
  });

  it("worked example via calculateRoundedShares: 2000/1750/1750 -> 36.4/31.8/31.8", () => {
    const result = calculateRoundedShares([
      { id: "1", income: 2000 },
      { id: "2", income: 1750 },
      { id: "3", income: 1750 },
    ]);
    expect(result.map((s) => s.percentage)).toEqual([36.4, 31.8, 31.8]);
    expect(result.reduce((s, m) => s + Math.round(m.percentage * 10), 0)).toBe(
      1000,
    );
  });

  it("should handle zero total income", () => {
    const members = [
      { id: "1", income: 0 },
      { id: "2", income: 0 },
    ];
    const result = calculateRoundedShares(members);

    expect(
      result.reduce((sum, s) => sum + Math.round(s.percentage * 10), 0),
    ).toBe(1000);
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
