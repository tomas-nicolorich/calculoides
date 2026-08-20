"use client";

import { useEffect, useState } from "react";
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

/**
 * theme-preference: icon-only variant of `ThemeToggle` for the auth pages
 * (`main`'s `frontend/src/features/theme-toggle/ui/ThemeIconToggle.tsx`).
 * Same hydration-safe `localStorage` + `.dark` class state/effect/toggle
 * logic as `./ThemeToggle`, just rendered as an `IconButton` with
 * `Sun`/`Moon` glyphs instead of the emoji + labeled switch.
 */
export function ThemeIconToggle() {
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
