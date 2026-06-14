import { describe, it, expect } from "vitest";
import {
  calculateProjectedMonths,
  addMonths,
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
