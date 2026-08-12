// @vitest-environment jsdom
import { describe, it, expect, vi, afterEach } from "vitest";
import { cleanup, render, screen } from "@testing-library/react";
import "@testing-library/jest-dom/vitest";
import { SidebarNav } from "./SidebarNav";

vi.mock("next/navigation", () => ({
  usePathname: () => "/dashboard/abc123",
  useParams: () => ({ groupId: "abc123" }),
}));

describe("SidebarNav", () => {
  afterEach(() => {
    cleanup();
  });

  // app-navigation-shell: "Desktop viewport shows the sidebar tree" (ADR-3
  // — CSS-first branching, never a JS `useIsMobile()` gate)
  it("carries hidden md:flex on the desktop tree", () => {
    const { container } = render(<SidebarNav />);

    expect(container.querySelector("aside")).toHaveClass("hidden", "md:flex");
  });

  it("renders every NAV_ITEMS entry as a NavItemLink", () => {
    render(<SidebarNav />);

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
});
