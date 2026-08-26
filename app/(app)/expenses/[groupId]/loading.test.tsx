// @vitest-environment jsdom
import { describe, it, expect, afterEach } from "vitest";
import { cleanup, render, screen } from "@testing-library/react";
import "@testing-library/jest-dom/vitest";
import ExpensesLoading from "./loading";

/**
 * task 2.10 (route-loading-states: "Every `(app)` Route Segment Renders a
 * Page-Shaped Skeleton Fallback"). Shaped like `ExpensesClient`'s populated
 * layout: `max-w-7xl` container, header + filter bar + expense rows.
 */
describe("expenses/[groupId]/loading", () => {
  afterEach(() => {
    cleanup();
  });

  it("renders the max-w-7xl container", () => {
    const { container } = render(<ExpensesLoading />);

    expect(container.firstElementChild).toHaveClass(
      "max-w-7xl",
      "mx-auto",
      "space-y-8",
    );
  });

  it("renders a filter bar and expense-row skeleton nodes", () => {
    const { container } = render(<ExpensesLoading />);

    expect(screen.getByTestId("expenses-loading-filters")).toBeInTheDocument();
    expect(screen.getByTestId("expenses-loading-rows")).toBeInTheDocument();
    expect(container.querySelectorAll(".animate-pulse").length).toBeGreaterThan(
      2,
    );
  });
});
