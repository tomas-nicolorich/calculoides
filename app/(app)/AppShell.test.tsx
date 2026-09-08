// @vitest-environment jsdom
import { describe, it, expect, vi, afterEach } from "vitest";
import { cleanup, render, screen, within } from "@testing-library/react";
import "@testing-library/jest-dom/vitest";
import { AppShell } from "./AppShell";

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

const GROUPS = [{ id: "group-1", name: "Roomies" }];

describe("AppShell", () => {
  afterEach(() => {
    cleanup();
  });

  // app-navigation-shell: "Desktop viewport shows the sidebar tree"
  it("renders the desktop sidebar tree gated by hidden md:flex", () => {
    render(
      <AppShell groups={GROUPS}>
        <p>page content</p>
      </AppShell>,
    );

    // Scoped to `aside`: both trees render (ADR-3), so an unscoped
    // "Dashboard" link query would now match the mobile tab bar too.
    const aside = screen.getByRole("complementary");
    expect(aside).toHaveClass("hidden", "md:flex");
    expect(
      within(aside).getByRole("link", { name: "Dashboard" }),
    ).toBeInTheDocument();
  });

  // app-navigation-shell: "Page content server-renders independently of the
  // shell" — `children` arrives as a prop, never an internal import of a
  // page module.
  it("renders children received as a prop", () => {
    render(
      <AppShell groups={GROUPS}>
        <p>page content</p>
      </AppShell>,
    );

    expect(screen.getByText("page content")).toBeInTheDocument();
  });

  // app-navigation-shell: "Mobile viewport shows the top/tab bar tree" —
  // CSS-first branching (ADR-3) renders both trees on every server render;
  // the mobile tree is gated by `md:hidden` alone, never a JS check.
  it("renders the mobile top/tab bar tree gated by md:hidden", () => {
    const { container } = render(
      <AppShell groups={GROUPS}>
        <p>page content</p>
      </AppShell>,
    );

    const tabBarNav = [...container.querySelectorAll("nav")].find((nav) =>
      nav.className.includes("fixed"),
    );

    expect(container.querySelector("header")).toHaveClass("md:hidden");
    expect(tabBarNav).toHaveClass("md:hidden");
  });
});
