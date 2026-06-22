import { Moon, Sun } from "lucide-react";
import { useState, useEffect } from "react";
import { IconButton } from "../../../shared/ui/IconButton";

export function ThemeIconToggle() {
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
