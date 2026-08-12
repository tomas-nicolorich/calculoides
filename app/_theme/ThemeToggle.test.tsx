// @vitest-environment jsdom
import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { render, screen, cleanup, fireEvent } from "@testing-library/react";
import "@testing-library/jest-dom/vitest";
import { ThemeToggle } from "./ThemeToggle";

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
    localStorage.clear();
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
    localStorage.setItem("theme", "dark");
    render(<ThemeToggle />);
    expect(document.documentElement.classList.contains("dark")).toBe(true);

    fireEvent.click(screen.getByRole("button"));

    expect(document.documentElement.classList.contains("dark")).toBe(false);
  });

  // theme-preference: "Preference survives a reload"
  it("writes the chosen preference to the 'theme' localStorage key", () => {
    render(<ThemeToggle />);

    fireEvent.click(screen.getByRole("button"));

    expect(localStorage.getItem("theme")).toBe("dark");
  });

  // theme-preference: "First-ever visit with no stored preference"
  it("falls back to a default without writing to storage until the first interaction", () => {
    render(<ThemeToggle />);

    expect(localStorage.getItem("theme")).toBeNull();

    fireEvent.click(screen.getByRole("button"));

    expect(localStorage.getItem("theme")).not.toBeNull();
  });

  // theme-preference: "OS preference changes after a manual choice is
  // already stored"
  it("does not change the applied theme when the OS preference changes after a manual choice is stored", () => {
    const { fireChange } = stubMatchMedia(false);
    localStorage.setItem("theme", "light");
    render(<ThemeToggle />);
    expect(document.documentElement.classList.contains("dark")).toBe(false);

    fireChange(true);

    expect(document.documentElement.classList.contains("dark")).toBe(false);
  });
});
