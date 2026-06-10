import { Moon, Sun } from "lucide-react";
import { useState, useEffect } from "react";

export function ThemeToggle() {
  const [isDark, setIsDark] = useState(() => {
    if (typeof window === "undefined") return false;
    const stored = localStorage.getItem("theme");
    if (stored === "dark") return true;
    if (stored === "light") return false;
    return window.matchMedia("(prefers-color-scheme: dark)").matches;
  });

  useEffect(() => {
    if (isDark) {
      document.documentElement.classList.add("dark");
    } else {
      document.documentElement.classList.remove("dark");
    }
  }, [isDark]);

  const toggle = () => {
    const next = !isDark;
    setIsDark(next);
    localStorage.setItem("theme", next ? "dark" : "light");
  };

  return (
    <button
      onClick={toggle}
      className="flex items-center justify-between w-full p-2 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
      aria-label="Toggle Dark Mode"
    >
      <div className="flex items-center gap-3">
        {isDark ? (
          <Moon size={18} className="text-brand-balance" />
        ) : (
          <Sun size={18} className="text-amber-500" />
        )}
        <span className="text-sm font-medium text-slate-700 dark:text-slate-200">
          Dark Mode
        </span>
      </div>
      <div
        className={`w-10 h-5 rounded-full p-1 transition-colors ${isDark ? "bg-brand-balance" : "bg-slate-200 dark:bg-slate-700"}`}
      >
        <div
          className={`w-3 h-3 bg-white rounded-full transition-transform ${isDark ? "translate-x-5" : "translate-x-0"}`}
        />
      </div>
    </button>
  );
}
