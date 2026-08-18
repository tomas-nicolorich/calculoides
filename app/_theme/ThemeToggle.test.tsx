// @vitest-environment jsdom
import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { render, screen, cleanup, fireEvent } from "@testing-library/react";
import "@testing-library/jest-dom/vitest";
import { ThemeToggle } from "./ThemeToggle";

/**
 * Node's built-in `localStorage` global (stable, but inert without
 * `--localstorage-file`) shadows jsdom's working `window.localStorage`
 * inside Vitest's jsdom pool: Vitest only repopulates a window key onto
 * `global` when that key isn't already present on `global`, and Node
 * defines `localStorage` itself. Install a minimal in-memory stand-in so
 * this file's `window.localStorage` calls behave like a real Storage.
 */
function installMemoryLocalStorage() {
  const store = new Map<string, string>();
  const storage: Storage = {
    getItem: (key) => (store.has(key) ? store.get(key)! : null),
    setItem: (key, value) => {
      store.set(key, String(value));
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

type ChangeListener = (event: { matches: boolean }) => void;

/** Stubs `window.matchMedia` and returns a helper to fire "change" events. */
function stubMatchMedia(prefersDark: boolean) {
  const listeners: ChangeListener[] = [];
  const mql = {
    matches: prefersDark,
    media: "(prefers-color-scheme: dark)",
    addEventListener: (event: string, cb: ChangeListener) => {
      if (event === "change") listeners.push(cb);
    },
    removeEventListener: vi.fn(),
  };
  window.matchMedia = vi.fn().mockReturnValue(mql);
  return {
    fireChange: (matches: boolean) => {
      mql.matches = matches;
      listeners.forEach((cb) => {
        cb({ matches });
      });
    },
  };
}

describe("ThemeToggle", () => {
  beforeEach(() => {
    window.localStorage.clear();
    document.documentElement.classList.remove("dark");
    stubMatchMedia(false);
  });

  afterEach(() => {
    cleanup();
  });

  // theme-preference: "Toggling to dark mode"
  it("adds .dark to <html> when toggled to dark mode", () => {
    render(<ThemeToggle />);

    fireEvent.click(screen.getByRole("button"));

    expect(document.documentElement.classList.contains("dark")).toBe(true);
  });

  // theme-preference: "Toggling back to light mode"
  it("removes .dark from <html> when toggled back to light mode", () => {
    window.localStorage.setItem("theme", "dark");
    render(<ThemeToggle />);
    expect(document.documentElement.classList.contains("dark")).toBe(true);

    fireEvent.click(screen.getByRole("button"));

    expect(document.documentElement.classList.contains("dark")).toBe(false);
  });

  // theme-preference: "Preference survives a reload"
  it("writes the chosen preference to the 'theme' localStorage key", () => {
    render(<ThemeToggle />);

    fireEvent.click(screen.getByRole("button"));

    expect(window.localStorage.getItem("theme")).toBe("dark");
  });

  // theme-preference: "First-ever visit with no stored preference"
  it("falls back to a default without writing to storage until the first interaction", () => {
    render(<ThemeToggle />);

    expect(window.localStorage.getItem("theme")).toBeNull();

    fireEvent.click(screen.getByRole("button"));

    expect(window.localStorage.getItem("theme")).not.toBeNull();
  });

  // theme-preference: "OS preference changes after a manual choice is
  // already stored"
  it("does not change the applied theme when the OS preference changes after a manual choice is stored", () => {
    const { fireChange } = stubMatchMedia(false);
    window.localStorage.setItem("theme", "light");
    render(<ThemeToggle />);
    expect(document.documentElement.classList.contains("dark")).toBe(false);

    fireChange(true);

    expect(document.documentElement.classList.contains("dark")).toBe(false);
  });
});
