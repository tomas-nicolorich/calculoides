/**
 * theme-preference: "A Blocking Inline Script Prevents a Flash of Wrong
 * Theme" — injected via `dangerouslySetInnerHTML` into `app/layout.tsx`'s
 * `<head>`, before `<body>` (8.7), so `.dark` lands on `<html>` before
 * first paint. Mirrors the pre-migration Vite `frontend/index.html` inline
 * script exactly, including the `"theme"` `localStorage` key, so an
 * existing user's stored preference survives the migration unchanged
 * (design.md ADR-7).
 */
export const THEME_SCRIPT = `(function () {
  try {
    var stored = localStorage.getItem("theme");
    var prefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
    if (stored === "dark" || (!stored && prefersDark)) {
      document.documentElement.classList.add("dark");
    }
  } catch (e) {}
})();`;
