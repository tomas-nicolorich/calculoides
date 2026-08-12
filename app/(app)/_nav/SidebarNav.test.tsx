// @vitest-environment jsdom
import { describe, it, expect, vi, afterEach } from "vitest";
import { cleanup, render, screen } from "@testing-library/react";
import "@testing-library/jest-dom/vitest";
import { SidebarNav } from "./SidebarNav";

vi.mock("next/navigation", () => ({
  usePathname: () => "/dashboard/abc123",
  useParams: () => ({ groupId: "abc123" }),
}));

// GroupSwitcher/AccountMenu have their own tests — mock here to assert
// composition/props only.
vi.mock("./GroupSwitcher", () => ({
  GroupSwitcher: ({ groups }: { groups: { id: string; name: string }[] }) => (
    <div data-testid="group-switcher">{groups.length} groups</div>
  ),
}));

vi.mock("./AccountMenu", () => ({
  AccountMenu: ({ user }: { user: { name: string | null } }) => (
    <div data-testid="account-menu">{user.name}</div>
  ),
}));

const GROUPS = [{ id: "group-1", name: "Roomies" }];
const USER = { id: "user-1", name: "Ana", email: "a@b.com" };

describe("SidebarNav", () => {
  afterEach(() => {
    cleanup();
  });

  // app-navigation-shell: "Desktop viewport shows the sidebar tree" (ADR-3
  // — CSS-first branching, never a JS `useIsMobile()` gate)
  it("carries hidden md:flex on the desktop tree", () => {
    const { container } = render(<SidebarNav groups={GROUPS} user={USER} />);

    expect(container.querySelector("aside")).toHaveClass("hidden", "md:flex");
  });

  it("renders every NAV_ITEMS entry as a NavItemLink", () => {
    render(<SidebarNav groups={GROUPS} user={USER} />);

    for (const label of [
      "Dashboard",
      "Expenses",
      "Transfers",
      "Savings",
      "Members",
      "Groups",
    ]) {
      expect(screen.getByRole("link", { name: label })).toBeInTheDocument();
    }
  });

  // Data Flow diagram: composes GroupSwitcher/AccountMenu, threading the
  // `groups`/`user` props AppShell previously discarded.
  it("composes GroupSwitcher and AccountMenu with the groups/user props", () => {
    render(<SidebarNav groups={GROUPS} user={USER} />);

    expect(screen.getByTestId("group-switcher")).toHaveTextContent("1 groups");
    expect(screen.getByTestId("account-menu")).toHaveTextContent("Ana");
  });
});
