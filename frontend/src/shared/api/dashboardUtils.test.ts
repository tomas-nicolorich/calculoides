import { describe, it, expect } from "vitest";
import {
  formatCurrency,
  progressState,
  progressPercent,
} from "./dashboardUtils";

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
