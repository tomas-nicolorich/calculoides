// @vitest-environment jsdom
import { describe, it, expect, vi, afterEach } from "vitest";
import { cleanup, render, screen } from "@testing-library/react";
import "@testing-library/jest-dom/vitest";
import { LayoutDashboard } from "lucide-react";
import { NavItemLink } from "./NavItemLink";
import type { NavItem } from "./navItems";

const usePathnameMock = vi.fn<() => string>();

vi.mock("next/navigation", () => ({
  usePathname: () => usePathnameMock(),
}));

const DASHBOARD_ITEM: NavItem = {
  key: "dashboard",
  label: "Dashboard",
  icon: LayoutDashboard,
  href: (groupId) => (groupId ? `/dashboard/${groupId}` : "/groups"),
  requiresGroup: true,
  showInTabBar: true,
  tone: "balance",
};

describe("NavItemLink", () => {
  afterEach(() => {
    cleanup();
    usePathnameMock.mockReset();
  });

  it("renders a next/link pointing at the item's resolved href", () => {
    usePathnameMock.mockReturnValue("/groups");

    render(<NavItemLink item={DASHBOARD_ITEM} groupId="abc123" />);

    expect(screen.getByRole("link", { name: "Dashboard" })).toHaveAttribute(
      "href",
      "/dashboard/abc123",
    );
  });

  // app-navigation-shell: "Dashboard route derives groupId from the path
  // segment" (active-highlighting half)
  it("marks itself active when usePathname() matches its href", () => {
    usePathnameMock.mockReturnValue("/dashboard/abc123");

    render(<NavItemLink item={DASHBOARD_ITEM} groupId="abc123" />);

    expect(screen.getByRole("link", { name: "Dashboard" })).toHaveAttribute(
      "aria-current",
      "page",
    );
  });

  it("does not mark itself active for a non-matching pathname", () => {
    usePathnameMock.mockReturnValue("/groups");

    render(<NavItemLink item={DASHBOARD_ITEM} groupId="abc123" />);

    expect(screen.getByRole("link", { name: "Dashboard" })).not.toHaveAttribute(
      "aria-current",
    );
  });

  // app-navigation-shell: "No active group hides group-scoped nav items"
  it("hides a group-scoped item when no groupId is resolvable", () => {
    usePathnameMock.mockReturnValue("/groups");

    const { container } = render(
      <NavItemLink item={DASHBOARD_ITEM} groupId={null} />,
    );

    expect(container).toBeEmptyDOMElement();
  });

  // Collapsed rail width — icon-only, label moves to aria-label/tooltip.
  it("renders icon-only with the label as aria-label when collapsed", () => {
    usePathnameMock.mockReturnValue("/groups");

    render(<NavItemLink item={DASHBOARD_ITEM} groupId="abc123" collapsed />);

    const link = screen.getByRole("link", { name: "Dashboard" });
    expect(link).toHaveAttribute("aria-label", "Dashboard");
    expect(link).not.toHaveTextContent("Dashboard");
  });
});
