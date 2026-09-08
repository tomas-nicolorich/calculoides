// @vitest-environment jsdom
import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { render, screen, cleanup, fireEvent } from "@testing-library/react";
import "@testing-library/jest-dom/vitest";
import { ThemeIconToggle } from "./ThemeIconToggle";

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

function stubMatchMedia(prefersDark: boolean) {
  const mql = {
    matches: prefersDark,
    media: "(prefers-color-scheme: dark)",
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
  };
  window.matchMedia = vi.fn().mockReturnValue(mql);
}

describe("ThemeIconToggle", () => {
  beforeEach(() => {
    window.localStorage.clear();
    document.documentElement.classList.remove("dark");
    stubMatchMedia(false);
  });

  afterEach(() => {
    cleanup();
  });

  it("adds .dark to <html> when toggled to dark mode", () => {
    render(<ThemeIconToggle />);

    fireEvent.click(screen.getByRole("button", { name: "Toggle theme" }));

    expect(document.documentElement.classList.contains("dark")).toBe(true);
  });

  it("removes .dark from <html> when toggled back to light mode", () => {
    window.localStorage.setItem("theme", "dark");
    render(<ThemeIconToggle />);
    expect(document.documentElement.classList.contains("dark")).toBe(true);

    fireEvent.click(screen.getByRole("button", { name: "Toggle theme" }));

    expect(document.documentElement.classList.contains("dark")).toBe(false);
  });

  it("writes the chosen preference to the 'theme' localStorage key", () => {
    render(<ThemeIconToggle />);

    fireEvent.click(screen.getByRole("button", { name: "Toggle theme" }));

    expect(window.localStorage.getItem("theme")).toBe("dark");
  });
});
