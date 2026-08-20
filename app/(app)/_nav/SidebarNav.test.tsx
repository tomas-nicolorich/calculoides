// @vitest-environment jsdom
import { describe, it, expect, vi, afterEach } from "vitest";
import { cleanup, render, screen, fireEvent } from "@testing-library/react";
import "@testing-library/jest-dom/vitest";
import { SidebarNav } from "./SidebarNav";

/**
 * Node's built-in `localStorage` global (stable, but inert without
 * `--localstorage-file`) shadows jsdom's working `window.localStorage`
 * inside Vitest's jsdom pool. `useSidebarCollapsed`/`ThemeToggle` both read
 * it on mount, so install a minimal in-memory stand-in (mirrors
 * `app/_theme/ThemeToggle.test.tsx`).
 */
function installMemoryLocalStorage() {
  const store = new Map<string, string>();
  const storage: Storage = {
    getItem: (key) => store.get(key) ?? null,
    setItem: (key, value) => {
      store.set(key, value);
    },
    removeItem: (key) => {
      store.delete(key);
    },
    clear: () => {
      store.clear();
    },
    key: (index) => Array.from(store.keys())[index] ?? null,
    get length() {
      return store.size;
    },
  };
  Object.defineProperty(window, "localStorage", {
    value: storage,
    configurable: true,
  });
}
installMemoryLocalStorage();

// `ThemeToggle` reads `matchMedia` for its OS-preference fallback on mount.
window.matchMedia = vi.fn().mockReturnValue({
  matches: false,
  media: "(prefers-color-scheme: dark)",
  addEventListener: vi.fn(),
  removeEventListener: vi.fn(),
});

vi.mock("next/navigation", () => ({
  usePathname: () => "/dashboard/abc123",
  useParams: () => ({ groupId: "abc123" }),
}));

const { signOutMock } = vi.hoisted(() => ({ signOutMock: vi.fn() }));
vi.mock("../../../lib/actions/session", () => ({ signOut: signOutMock }));

// GroupSwitcher has its own tests — mock here to assert composition/props
// only.
vi.mock("./GroupSwitcher", () => ({
  GroupSwitcher: ({ groups }: { groups: { id: string; name: string }[] }) => (
    <div data-testid="group-switcher">{groups.length} groups</div>
  ),
}));

const GROUPS = [{ id: "group-1", name: "Roomies" }];

describe("SidebarNav", () => {
  afterEach(() => {
    cleanup();
    signOutMock.mockReset();
  });

  // app-navigation-shell: "Desktop viewport shows the sidebar tree" (ADR-3
  // — CSS-first branching, never a JS `useIsMobile()` gate)
  it("carries hidden md:flex on the desktop tree", () => {
    const { container } = render(<SidebarNav groups={GROUPS} />);

    expect(container.querySelector("aside")).toHaveClass("hidden", "md:flex");
  });

  it("renders every NAV_ITEMS entry as a NavItemLink, including Profile", () => {
    render(<SidebarNav groups={GROUPS} />);

    for (const label of [
      "Dashboard",
      "Expenses",
      "Transfers",
      "Savings",
      "Members",
      "Groups",
      "Profile",
    ]) {
      expect(screen.getByRole("link", { name: label })).toBeInTheDocument();
    }
  });

  it("composes GroupSwitcher with the groups prop", () => {
    render(<SidebarNav groups={GROUPS} />);

    expect(screen.getByTestId("group-switcher")).toHaveTextContent("1 groups");
  });

  // main parity: theme toggle, collapse toggle, and sign out render as
  // direct rows in the footer, not behind a dropdown.
  it("renders the theme toggle, collapse button, and sign out button", () => {
    render(<SidebarNav groups={GROUPS} />);

    expect(
      screen.getByRole("button", { name: "Toggle Dark Mode" }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "Collapse sidebar" }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "Sign Out" }),
    ).toBeInTheDocument();
  });

  it("calls signOut() when Sign Out is clicked", () => {
    render(<SidebarNav groups={GROUPS} />);

    fireEvent.click(screen.getByRole("button", { name: "Sign Out" }));

    expect(signOutMock).toHaveBeenCalled();
  });

  it("collapses to a narrower rail and swaps the collapse button's label when toggled", () => {
    const { container } = render(<SidebarNav groups={GROUPS} />);

    fireEvent.click(screen.getByRole("button", { name: "Collapse sidebar" }));

    expect(container.querySelector("aside")).toHaveClass("md:w-[68px]");
    expect(
      screen.getByRole("button", { name: "Expand sidebar" }),
    ).toBeInTheDocument();
  });
});
