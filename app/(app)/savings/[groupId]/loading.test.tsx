// @vitest-environment jsdom
import { describe, it, expect, afterEach } from "vitest";
import { cleanup, render, screen } from "@testing-library/react";
import "@testing-library/jest-dom/vitest";
import SavingsLoading from "./loading";

/**
 * task 2.10 (route-loading-states: "Every `(app)` Route Segment Renders a
 * Page-Shaped Skeleton Fallback"). Shaped like `SavingsClient`'s populated
 * layout: `max-w-6xl` container, header + goal cards.
 */
describe("savings/[groupId]/loading", () => {
  afterEach(() => {
    cleanup();
  });

  it("renders the max-w-6xl container", () => {
    const { container } = render(<SavingsLoading />);

    expect(container.firstElementChild).toHaveClass(
      "max-w-6xl",
      "mx-auto",
      "space-y-8",
    );
  });

  it("renders goal-card skeleton nodes", () => {
    const { container } = render(<SavingsLoading />);

    expect(screen.getByTestId("savings-loading-cards")).toBeInTheDocument();
    expect(container.querySelectorAll(".animate-pulse").length).toBeGreaterThan(
      2,
    );
  });
});
