// @vitest-environment jsdom
import { describe, it, expect, afterEach } from "vitest";
import { cleanup, render, screen } from "@testing-library/react";
import "@testing-library/jest-dom/vitest";
import AppLoading from "./loading";

/**
 * task 2.10 (route-loading-states: "Every `(app)` Route Segment Renders a
 * Page-Shaped Skeleton Fallback"). Generic content skeleton — the safety net
 * for any `(app)` segment without its own `loading.tsx` (design.md Decision
 * 2: `app/(app)/layout.tsx` is not streamed, so this renders inside
 * `AppShell`'s `<main>` slot, never remounting the shell).
 */
describe("(app)/loading", () => {
  afterEach(() => {
    cleanup();
  });

  it("renders the generic max-w-7xl content skeleton container", () => {
    const { container } = render(<AppLoading />);

    expect(container.firstElementChild).toHaveClass(
      "max-w-7xl",
      "mx-auto",
      "space-y-8",
    );
  });

  it("renders skeleton placeholder nodes, not a spinner", () => {
    const { container } = render(<AppLoading />);

    expect(container.querySelectorAll(".animate-pulse").length).toBeGreaterThan(
      0,
    );
    expect(screen.queryByRole("status")).not.toBeInTheDocument();
  });
});
