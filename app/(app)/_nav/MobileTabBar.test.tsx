// @vitest-environment jsdom
import { describe, it, expect, vi, afterEach } from "vitest";
import { cleanup, render, screen } from "@testing-library/react";
import "@testing-library/jest-dom/vitest";
import { MobileTabBar } from "./MobileTabBar";

vi.mock("next/navigation", () => ({
  usePathname: () => "/expenses/abc123",
  useParams: () => ({ groupId: "abc123" }),
}));

describe("MobileTabBar", () => {
  afterEach(() => {
    cleanup();
  });

  // Bottom-fixed, `md:hidden`, only `showInTabBar` entries render (Members
  // is excluded).
  it("is bottom-fixed, md:hidden, and renders only showInTabBar entries", () => {
    const { container } = render(<MobileTabBar />);
    expect(container.querySelector("nav")).toHaveClass(
      "fixed",
      "bottom-0",
      "md:hidden",
    );
    for (const label of [
      "Dashboard",
      "Expenses",
      "Transfers",
      "Savings",
      "Groups",
    ]) {
      expect(screen.getByRole("link", { name: label })).toBeInTheDocument();
    }
    expect(
      screen.queryByRole("link", { name: "Members" }),
    ).not.toBeInTheDocument();
  });

  it("highlights the active tab against the current pathname", () => {
    render(<MobileTabBar />);
    expect(screen.getByRole("link", { name: "Expenses" })).toHaveAttribute(
      "aria-current",
      "page",
    );
    expect(screen.getByRole("link", { name: "Dashboard" })).not.toHaveAttribute(
      "aria-current",
    );
  });
});
