import { describe, it, expect } from "vitest";
import { NAV_ITEMS, type NavItem } from "./navItems";

function itemFor(key: NavItem["key"]): NavItem {
  const item = NAV_ITEMS.find((candidate) => candidate.key === key);
  if (!item) throw new Error(`no NAV_ITEMS entry for "${key}"`);
  return item;
}

describe("NAV_ITEMS", () => {
  // app-navigation-shell: "Members nav item builds a query-string href"
  it("builds a query-string href for Members, not a path segment", () => {
    expect(itemFor("members").href("abc123")).toBe("/members?groupId=abc123");
  });

  it("builds a plain /segment/[groupId] path for the other group-scoped items", () => {
    expect(itemFor("dashboard").href("abc123")).toBe("/dashboard/abc123");
    expect(itemFor("expenses").href("abc123")).toBe("/expenses/abc123");
    expect(itemFor("transfers").href("abc123")).toBe("/transfers/abc123");
    expect(itemFor("savings").href("abc123")).toBe("/savings/abc123");
  });

  it("builds a static path for Groups, which never requires a group", () => {
    const groups = itemFor("groups");
    expect(groups.requiresGroup).toBe(false);
    expect(groups.href(null)).toBe("/groups");
  });

  it("falls back to /groups for a group-scoped item with no active group", () => {
    expect(itemFor("dashboard").href(null)).toBe("/groups");
    expect(itemFor("members").href(null)).toBe("/groups");
  });
});
