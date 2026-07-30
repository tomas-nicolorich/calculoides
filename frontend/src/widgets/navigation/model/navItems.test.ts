import { describe, it, expect } from "vitest";
import { matchNavItem, NAV_ITEMS } from "./navItems";

describe("matchNavItem", () => {
  it("returns the matching item for a parameterized route", () => {
    const item = matchNavItem("/dashboard/abc123");
    expect(item?.label).toBe("Dashboard");
  });

  it("returns null when no nav pattern matches the path", () => {
    expect(matchNavItem("/complete-profile")).toBeNull();
  });

  it("matches every configured nav item's own pattern", () => {
    for (const item of NAV_ITEMS) {
      const samplePath = item.pattern.replace(":groupId", "sample-id");
      expect(matchNavItem(samplePath)).toBe(item);
    }
  });
});
