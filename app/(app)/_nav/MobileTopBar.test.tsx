// @vitest-environment jsdom
import { describe, it, expect, vi, afterEach } from "vitest";
import { cleanup, render, screen } from "@testing-library/react";
import "@testing-library/jest-dom/vitest";
import { MobileTopBar } from "./MobileTopBar";

vi.mock("next/navigation", () => ({
  usePathname: () => "/dashboard/abc123",
  useParams: () => ({ groupId: "abc123" }),
}));

const GROUPS = [{ id: "abc123", name: "Roomies" }];

describe("MobileTopBar", () => {
  afterEach(() => {
    cleanup();
  });

  // "Persistent Shell Renders via CSS-First Responsive Branching" (mobile
  // half) — `md:hidden` gates the bar; brand links to /groups.
  it("carries md:hidden and renders the brand as a link to /groups", () => {
    const { container } = render(<MobileTopBar groups={GROUPS} />);
    expect(container.querySelector("header")).toHaveClass("md:hidden");
    expect(screen.getByRole("link", { name: /Calculoides/i })).toHaveAttribute(
      "href",
      "/groups",
    );
  });

  // "group switcher slot" — the real GroupSwitcher, receiving `groups`.
  it("renders the group switcher", () => {
    render(<MobileTopBar groups={GROUPS} />);
    expect(
      screen.getByRole("button", { name: "Switch group" }),
    ).toHaveTextContent("Roomies");
  });
});
