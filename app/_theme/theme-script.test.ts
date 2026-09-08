import { describe, it, expect } from "vitest";
import { THEME_SCRIPT } from "./theme-script";

// theme-preference: "A Blocking Inline Script Prevents a Flash of Wrong
// Theme" — `THEME_SCRIPT` is injected as a raw <script> tag via
// `dangerouslySetInnerHTML` (8.7), so these assertions inspect the string
// content only, never execute it in this test environment.
describe("THEME_SCRIPT", () => {
  it("is a plain string", () => {
    expect(typeof THEME_SCRIPT).toBe("string");
  });

  it("reads the pre-migration 'theme' localStorage key", () => {
    expect(THEME_SCRIPT).toContain('localStorage.getItem("theme")');
  });

  it("sets .dark on document.documentElement", () => {
    expect(THEME_SCRIPT).toContain(
      'document.documentElement.classList.add("dark")',
    );
  });

  it("falls back to the OS preference only when nothing is stored", () => {
    expect(THEME_SCRIPT).toContain("prefers-color-scheme: dark");
    expect(THEME_SCRIPT).toMatch(/!stored\s*&&\s*prefersDark/);
  });

  it("is import-free and self-invoking, safe for a raw <script> tag", () => {
    expect(THEME_SCRIPT).not.toMatch(/\bimport\b|\bexport\b/);
    expect(THEME_SCRIPT.trim().startsWith("(function")).toBe(true);
  });
});
