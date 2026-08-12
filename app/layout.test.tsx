import { describe, it, expect } from "vitest";
import type { ReactElement } from "react";
import RootLayout from "./layout";
import { THEME_SCRIPT } from "./_theme/theme-script";

function toArray(children: unknown): unknown[] {
  return Array.isArray(children) ? children : [children];
}

// theme-preference: "A Blocking Inline Script Prevents a Flash of Wrong
// Theme" — inspects the returned element tree directly (no DOM needed,
// matches the repo's default "node" Vitest environment).
describe("app/layout", () => {
  it("marks <html> with suppressHydrationWarning and injects THEME_SCRIPT into <head> before <body>", () => {
    const html = RootLayout({ children: "content" }) as ReactElement<{
      suppressHydrationWarning?: boolean;
      children: unknown;
    }>;

    expect(html.type).toBe("html");
    expect(html.props.suppressHydrationWarning).toBe(true);

    const topLevel = toArray(html.props.children) as ReactElement<{
      children: unknown;
    }>[];
    const headIndex = topLevel.findIndex((child) => child.type === "head");
    const bodyIndex = topLevel.findIndex((child) => child.type === "body");

    expect(headIndex).toBeGreaterThanOrEqual(0);
    expect(bodyIndex).toBeGreaterThan(headIndex);

    const headChildren = toArray(
      topLevel[headIndex].props.children,
    ) as ReactElement<{ dangerouslySetInnerHTML?: { __html: string } }>[];
    const script = headChildren.find((child) => child.type === "script");

    expect(script?.props.dangerouslySetInnerHTML?.__html).toBe(THEME_SCRIPT);
  });

  it("adds font-sans to <body>", () => {
    const html = RootLayout({ children: "content" }) as ReactElement<{
      children: unknown;
    }>;
    const topLevel = toArray(html.props.children) as ReactElement<{
      className?: string;
    }>[];
    const body = topLevel.find((child) => child.type === "body");

    expect(body?.props.className).toContain("font-sans");
  });
});
