// @vitest-environment jsdom
import { describe, it, expect, vi, afterEach } from "vitest";
import { cleanup, render, screen } from "@testing-library/react";
import "@testing-library/jest-dom/vitest";
import { AppShell } from "./AppShell";

vi.mock("next/navigation", () => ({
  usePathname: () => "/dashboard/abc123",
  useParams: () => ({ groupId: "abc123" }),
}));

const GROUPS = [{ id: "group-1", name: "Roomies" }];
const USER = { id: "user-1", name: "Ana", email: "a@b.com" };

describe("AppShell", () => {
  afterEach(() => {
    cleanup();
  });

  // app-navigation-shell: "Desktop viewport shows the sidebar tree"
  it("renders the desktop sidebar tree gated by hidden md:flex", () => {
    const { container } = render(
      <AppShell groups={GROUPS} user={USER}>
        <p>page content</p>
      </AppShell>,
    );

    expect(container.querySelector("aside")).toHaveClass("hidden", "md:flex");
    expect(screen.getByRole("link", { name: "Dashboard" })).toBeInTheDocument();
  });

  // app-navigation-shell: "Page content server-renders independently of the
  // shell" — `children` arrives as a prop, never an internal import of a
  // page module.
  it("renders children received as a prop", () => {
    render(
      <AppShell groups={GROUPS} user={USER}>
        <p>page content</p>
      </AppShell>,
    );

    expect(screen.getByText("page content")).toBeInTheDocument();
  });
});
