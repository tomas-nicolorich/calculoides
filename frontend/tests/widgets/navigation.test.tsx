import { render, screen, fireEvent } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { AppShell } from "@/app/ui/AppShell";
import type { Group } from "@/entities/group";

/**
 * Slice 1 (PR1): Shell + Nav Items.
 * Covers spec requirements: Persistent Shell Chrome, Active Route
 * Highlighting, Bottom-Pinned Sidebar Controls.
 *
 * Slice 2 (PR2) adds the Group Switcher (Many/Single/Zero groups scenarios
 * below) on top of the same desktop chrome harness.
 */

vi.mock("@/app/providers/AuthContext", () => ({
  useAuth: () => ({
    user: { id: "u1", email: "test@example.com" },
    signOut: vi.fn(),
  }),
}));

let mockGroupId: string | null = "group-1";
const setActiveGroupId = vi.fn();
vi.mock("@/app/providers/ActiveGroupContext", () => ({
  useActiveGroup: () => mockGroupId,
  useActiveGroupSetter: () => setActiveGroupId,
}));

let mockGroups: Group[] = [];
vi.mock("@/app/providers/GroupListContext", () => ({
  useGroupList: () => ({
    groups: mockGroups,
    loading: false,
    error: null,
    refresh: vi.fn(),
  }),
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

function makeGroup(id: string, name: string, memberCount: number): Group {
  return {
    id,
    name,
    ownerId: "u1",
    role: "OWNER",
    members: Array.from(
      { length: memberCount },
      (_, i) =>
        ({ id: `${id}-m${String(i)}`, income: 0 }) as Group["members"][number],
    ),
  };
}

describe("AppShell navigation (desktop)", () => {
  beforeEach(() => {
    mockGroupId = "group-1";
    mockGroups = [];
    setActiveGroupId.mockClear();
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

describe("Group switcher", () => {
  beforeEach(() => {
    mockGroupId = null;
    mockGroups = [];
    setActiveGroupId.mockClear();
    localStorage.clear();
  });

  // Base UI's Menu opens on click, but `userEvent.click`'s full realistic
  // pointerdown/mouseup/click sequence races with the popup's own mount
  // effect in jsdom, intermittently swallowing the open. `fireEvent.click`
  // dispatches a single click event and reliably reflects the resulting
  // open state instead.

  it("lists the first 3 groups in API order plus Show More when there are more than 3", () => {
    mockGroups = [
      makeGroup("g1", "Alpha", 2),
      makeGroup("g2", "Beta", 3),
      makeGroup("g3", "Gamma", 1),
      makeGroup("g4", "Delta", 4),
      makeGroup("g5", "Epsilon", 2),
    ];
    renderShell("/dashboard/g1");

    fireEvent.click(screen.getByRole("button", { name: "Switch group" }));

    expect(screen.getByText("Alpha")).toBeInTheDocument();
    expect(screen.getByText("Beta")).toBeInTheDocument();
    expect(screen.getByText("Gamma")).toBeInTheDocument();
    expect(screen.queryByText("Delta")).not.toBeInTheDocument();
    expect(screen.queryByText("Epsilon")).not.toBeInTheDocument();
    expect(
      screen.getByRole("menuitem", { name: /show more/i }),
    ).toHaveAttribute("href", "/groups");
  });

  it("lists the single group with no Show More entry", () => {
    mockGroups = [makeGroup("g1", "Solo Group", 1)];
    renderShell("/groups");

    fireEvent.click(screen.getByRole("button", { name: "Switch group" }));

    expect(screen.getByText("Solo Group")).toBeInTheDocument();
    expect(
      screen.queryByRole("menuitem", { name: /show more/i }),
    ).not.toBeInTheDocument();
  });

  it("shows an empty state with a path to /groups when the user has zero groups", () => {
    mockGroups = [];
    renderShell("/groups");

    fireEvent.click(screen.getByRole("button", { name: "Switch group" }));

    expect(screen.getByText(/not part of any groups yet/i)).toBeInTheDocument();
    expect(
      screen.getByRole("link", { name: /browse groups/i }),
    ).toHaveAttribute("href", "/groups");
  });
});
