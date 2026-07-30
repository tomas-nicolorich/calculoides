import { describe, it, expect } from "vitest";
import { matchNavItem, groupSwitchTarget, NAV_ITEMS } from "./navItems";

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

/**
 * Slice 2 (task 2.2). `groupSwitchTarget` was implemented in Slice 1 (task
 * 1.3) per the design contract so this file wouldn't need touching again —
 * these are its first tests, written as approval tests over the existing
 * implementation (documented Strict-TDD exception, see apply-progress).
 */
describe("groupSwitchTarget", () => {
  it("re-binds the currently matched nav pattern to the new group id", () => {
    expect(groupSwitchTarget("/expenses/old-group", "new-group")).toBe(
      "/expenses/new-group",
    );
  });

  it("re-binds every group-scoped nav pattern, not just one", () => {
    expect(groupSwitchTarget("/savings/old-group", "new-group")).toBe(
      "/savings/new-group",
    );
    expect(groupSwitchTarget("/transfers/old-group", "new-group")).toBe(
      "/transfers/new-group",
    );
  });

  it("falls back to /dashboard/:groupId when the path matches no nav item", () => {
    expect(groupSwitchTarget("/complete-profile", "new-group")).toBe(
      "/dashboard/new-group",
    );
  });
});
