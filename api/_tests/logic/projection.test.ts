import { describe, it, expect } from "vitest";
import {
  calculateProjectedMonths,
  addMonths,
  calculateMonthsRemaining,
} from "../../../shared/logic/projection";

describe("calculateProjectedMonths", () => {
  it("normal: returns ceil(remaining/monthly)", () => {
    expect(calculateProjectedMonths(10000, 2000, 800)).toBe(10);
  });

  it("already funded: returns 0 when starting >= target", () => {
    expect(calculateProjectedMonths(5000, 6000, 500)).toBe(0);
  });

  it("zero contributions: returns Infinity", () => {
    expect(calculateProjectedMonths(10000, 0, 0)).toBe(Infinity);
  });

  it("negative monthly: returns Infinity", () => {
    expect(calculateProjectedMonths(10000, 0, -100)).toBe(Infinity);
  });
});

describe("addMonths", () => {
  it("normal: adds months correctly", () => {
    const result = addMonths(new Date("2026-01-01"), 3);
    expect(result.getFullYear()).toBe(2026);
    expect(result.getMonth()).toBe(3); // April = index 3
    expect(result.getDate()).toBe(1);
  });

  it("Infinity: returns startDate + 100 years", () => {
    const result = addMonths(new Date("2026-01-01"), Infinity);
    expect(result.getFullYear()).toBe(2126);
  });

  it("zero: returns a copy of input date", () => {
    const input = new Date("2026-06-06");
    const result = addMonths(input, 0);
    expect(result.getTime()).toBe(input.getTime());
  });

  it("no mutation: does not mutate the original date", () => {
    const input = new Date("2026-03-15");
    const originalTime = input.getTime();
    addMonths(input, 5);
    expect(input.getTime()).toBe(originalTime);
  });
});

describe("calculateMonthsRemaining", () => {
  it("E1: multi-month goal excludes the elapsed and deadline months (rawDiff 13 -> 12)", () => {
    const now = new Date(2026, 6, 17); // July 17, 2026
    const target = new Date(2027, 7, 17); // August 17, 2027
    expect(calculateMonthsRemaining(now, target)).toBe(12);
  });

  it("E2: target exactly one calendar month out hits the lump-sum boundary (rawDiff 1 -> 0)", () => {
    const now = new Date(2026, 6, 17); // July 17, 2026
    const target = new Date(2026, 7, 5); // August 5, 2026
    expect(calculateMonthsRemaining(now, target)).toBe(0);
  });

  it("E3: target within the current month returns a negative value (rawDiff 0 -> -1)", () => {
    const now = new Date(2026, 6, 17); // July 17, 2026
    const target = new Date(2026, 6, 25); // July 25, 2026
    expect(calculateMonthsRemaining(now, target)).toBe(-1);
  });

  it("E4/E5: axis-consistency with calculateProjectedMonths' contribution-opportunity count", () => {
    const now = new Date(2026, 0, 1); // Jan 1, 2026
    const target = new Date(2027, 1, 1); // Feb 1, 2027 (rawDiff 13 -> 12 opportunities)
    expect(calculateMonthsRemaining(now, target)).toBe(12);

    // E4 on-pace: closing 12000 at 1000/mo needs exactly the 12 opportunities offered
    const onPaceProjected = calculateProjectedMonths(12000, 0, 1000);
    expect(onPaceProjected).toBe(12);
    expect(onPaceProjected).toBe(calculateMonthsRemaining(now, target));

    // E5 just-behind: closing 13000 at 1000/mo needs 13 opportunities, but only 12 are offered
    const behindProjected = calculateProjectedMonths(13000, 0, 1000);
    expect(behindProjected).toBe(13);
    expect(behindProjected).toBeGreaterThan(
      calculateMonthsRemaining(now, target),
    );
  });
});
