"use client";

import { useEffect, useState, useSyncExternalStore } from "react";
import { Moon, Sun } from "lucide-react";
import { IconButton } from "../_ui";

const THEME_STORAGE_KEY = "theme";

function resolveInitialIsDark(): boolean {
  if (typeof window === "undefined") return false;
  const stored = window.localStorage.getItem(THEME_STORAGE_KEY);
  if (stored === "dark") return true;
  if (stored === "light") return false;
  return window.matchMedia("(prefers-color-scheme: dark)").matches;
}

function subscribeNoop() {
  // No external change events to subscribe to — this store is only ever
  // read once, on mount, to resolve the SSR-unknowable initial theme.
  return () => undefined;
}

function getServerSnapshot() {
  return false;
}

/**
 * theme-preference: icon-only variant of `ThemeToggle` for the auth pages
 * (`main`'s `frontend/src/features/theme-toggle/ui/ThemeIconToggle.tsx`).
 * Same hydration-safe `localStorage` + `.dark` class state/effect/toggle
 * logic as `./ThemeToggle`, just rendered as an `IconButton` with
 * `Sun`/`Moon` glyphs instead of the emoji + labeled switch.
 */
export function ThemeIconToggle() {
  // `useSyncExternalStore` renders the SSR-safe `getServerSnapshot` (false)
  // on the client's hydration pass too, then re-syncs to the real
  // `resolveInitialIsDark()` value right after — avoids the Sun/Moon
  // hydration mismatch a lazy `useState(resolveInitialIsDark)` initializer
  // produced (it read `window` during render, disagreeing with the server
  // on the very first client render).
  const resolvedIsDark = useSyncExternalStore(
    subscribeNoop,
    resolveInitialIsDark,
    getServerSnapshot,
  );
  const [override, setOverride] = useState<boolean | null>(null);
  const isDark = override ?? resolvedIsDark;

  useEffect(() => {
    document.documentElement.classList.toggle("dark", isDark);
  }, [isDark]);

  const toggle = () => {
    const next = !isDark;
    setOverride(next);
    window.localStorage.setItem(THEME_STORAGE_KEY, next ? "dark" : "light");
  };

  return (
    <IconButton
      bordered
      hover="transfer"
      aria-label="Toggle theme"
      onClick={toggle}
    >
      {isDark ? <Sun size={18} /> : <Moon size={18} />}
    </IconButton>
  );
}
