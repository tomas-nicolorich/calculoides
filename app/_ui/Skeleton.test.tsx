// @vitest-environment jsdom
import { describe, it, expect, afterEach } from "vitest";
import { cleanup, render, screen } from "@testing-library/react";
import "@testing-library/jest-dom/vitest";
import { Skeleton } from "./Skeleton";

/**
 * PR 4 (spec `ui-design-system`): ported verbatim from `main`'s
 * `shared/ui/Skeleton.tsx` — a pulsing placeholder bar, `className`
 * passthrough via `cn`.
 */
describe("Skeleton", () => {
  afterEach(() => {
    cleanup();
  });

  it("renders a pulsing placeholder bar with the ported shimmer class", () => {
    render(<Skeleton data-testid="skeleton" />);

    expect(screen.getByTestId("skeleton")).toHaveClass(
      "animate-pulse",
      "rounded-md",
      "bg-slate-200",
    );
  });

  it("merges a passed className with the ported classes", () => {
    render(<Skeleton data-testid="skeleton" className="h-4 w-24" />);

    expect(screen.getByTestId("skeleton")).toHaveClass(
      "animate-pulse",
      "h-4",
      "w-24",
    );
  });
});
