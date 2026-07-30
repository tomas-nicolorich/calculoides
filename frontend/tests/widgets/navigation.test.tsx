import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { AppShell } from "@/app/ui/AppShell";

/**
 * Slice 1 (PR1): Shell + Nav Items.
 * Covers spec requirements: Persistent Shell Chrome, Active Route
 * Highlighting, Bottom-Pinned Sidebar Controls. No group switcher yet
 * (Slice 2) — Savings keeps today's per-route `groupId` gating only.
 */

vi.mock("@/app/providers/AuthContext", () => ({
  useAuth: () => ({
    user: { id: "u1", email: "test@example.com" },
    signOut: vi.fn(),
  }),
}));

let mockGroupId: string | null = "group-1";
vi.mock("@/app/providers/ActiveGroupContext", () => ({
  useActiveGroup: () => mockGroupId,
}));

function renderShell(initialEntry: string) {
  return render(
    <MemoryRouter initialEntries={[initialEntry]}>
      <AppShell>
        <div>Page Content</div>
      </AppShell>
    </MemoryRouter>,
  );
}

describe("AppShell navigation (desktop)", () => {
  beforeEach(() => {
    mockGroupId = "group-1";
    localStorage.clear();
  });

  it("renders the sidebar chrome with brand, nav items, and bottom-pinned controls", () => {
    renderShell("/dashboard/group-1");

    expect(screen.getByText("Calculoides")).toBeInTheDocument();
    expect(
      screen.getByRole("navigation", { name: "Primary" }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("link", { name: /Dashboard/i }),
    ).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /Expenses/i })).toBeInTheDocument();
    expect(
      screen.getByRole("link", { name: /Transfers/i }),
    ).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /Groups/i })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /Profile/i })).toBeInTheDocument();
    expect(screen.getByLabelText("Toggle Dark Mode")).toBeInTheDocument();
    expect(screen.getByLabelText("Collapse sidebar")).toBeInTheDocument();
    expect(screen.getByLabelText("Sign Out")).toBeInTheDocument();
  });

  it("still renders chrome for a zero-group user and hides the group-gated Savings item", () => {
    mockGroupId = null;
    renderShell("/groups");

    expect(
      screen.getByRole("navigation", { name: "Primary" }),
    ).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /Groups/i })).toBeInTheDocument();
    expect(
      screen.queryByRole("link", { name: /Savings/i }),
    ).not.toBeInTheDocument();
  });

  it("marks the nav item matching a parameterized route as aria-current", () => {
    renderShell("/dashboard/abc123");

    expect(screen.getByRole("link", { name: /Dashboard/i })).toHaveAttribute(
      "aria-current",
      "page",
    );
    expect(screen.getByRole("link", { name: /Expenses/i })).not.toHaveAttribute(
      "aria-current",
    );
  });

  it("marks no nav item active when the current path matches no nav pattern", () => {
    renderShell("/complete-profile");

    for (const name of [
      "Dashboard",
      "Expenses",
      "Transfers",
      "Groups",
      "Profile",
    ]) {
      expect(
        screen.getByRole("link", { name: new RegExp(name, "i") }),
      ).not.toHaveAttribute("aria-current");
    }
  });

  it("keeps theme toggle, collapse, and sign out present and operable when the rail is collapsed", async () => {
    const user = userEvent.setup();
    renderShell("/dashboard/group-1");

    await user.click(screen.getByLabelText("Collapse sidebar"));

    expect(localStorage.getItem("calculoides.sidebarCollapsed")).toBe("true");
    expect(screen.getByLabelText("Toggle Dark Mode")).toBeInTheDocument();
    expect(screen.getByLabelText("Expand sidebar")).toBeInTheDocument();
    expect(screen.getByLabelText("Sign Out")).toBeInTheDocument();
  });
});
