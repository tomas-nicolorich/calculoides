"use client";

import { useEffect, useState, useSyncExternalStore } from "react";
import { Moon, Sun } from "lucide-react";
import { cn } from "../../lib/cn";

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
 * theme-preference: "Manual Toggle Sets `.dark` on the Document Element" —
 * pure `localStorage` + `.dark` class toggle, zero router/data coupling.
 * Direct port of `main`'s
 * `frontend/src/features/theme-toggle/ui/ThemeToggle.tsx`, reusing its
 * exact `"theme"` `localStorage` key so a pre-migration user's stored
 * preference survives unchanged.
 *
 * The OS-preference fallback is read once, on first render only — there is
 * deliberately no `matchMedia` "change" listener, so a later OS change
 * never overrides an already-stored manual choice (theme-preference:
 * "First Load Without a Stored Preference Falls Back Once, Without Ongoing
 * OS Sync").
 */
export function ThemeToggle({ collapsed = false }: { collapsed?: boolean }) {
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
    <button
      type="button"
      onClick={toggle}
      aria-label="Toggle Dark Mode"
      className={cn(
        "flex w-full items-center gap-3 rounded-xl p-2 transition-colors hover:bg-slate-100 dark:hover:bg-slate-800",
        collapsed ? "justify-center" : "justify-between",
      )}
    >
      <span className="flex items-center gap-3 text-sm font-medium text-slate-700 dark:text-slate-200">
        {isDark ? (
          <Moon size={18} aria-hidden="true" className="text-brand-balance" />
        ) : (
          <Sun size={18} aria-hidden="true" className="text-amber-500" />
        )}
        {!collapsed && "Dark Mode"}
      </span>
      {!collapsed && (
        <span
          className={`h-5 w-10 rounded-full p-1 transition-colors ${
            isDark ? "bg-brand-balance" : "bg-slate-200 dark:bg-slate-700"
          }`}
        >
          <span
            className={`block h-3 w-3 rounded-full bg-white transition-transform ${
              isDark ? "translate-x-5" : "translate-x-0"
            }`}
          />
        </span>
      )}
    </button>
  );
}
