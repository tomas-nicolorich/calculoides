"use client";

import { useEffect, useState } from "react";
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
  const [isDark, setIsDark] = useState(resolveInitialIsDark);

  useEffect(() => {
    document.documentElement.classList.toggle("dark", isDark);
  }, [isDark]);

  const toggle = () => {
    const next = !isDark;
    setIsDark(next);
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
