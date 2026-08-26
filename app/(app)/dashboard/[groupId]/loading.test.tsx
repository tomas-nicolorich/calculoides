// @vitest-environment jsdom
import { describe, it, expect, afterEach } from "vitest";
import { cleanup, render, screen } from "@testing-library/react";
import "@testing-library/jest-dom/vitest";
import DashboardLoading from "./loading";

/**
 * task 2.10 (route-loading-states: "Every `(app)` Route Segment Renders a
 * Page-Shaped Skeleton Fallback"). Renders the shared `DashboardSkeleton` so
 * the segment's own `<Suspense>` boundary (Slice B) hands off with no
 * visible repaint.
 */
describe("dashboard/[groupId]/loading", () => {
  afterEach(() => {
    cleanup();
  });

  it("renders the max-w-7xl DashboardSkeleton container", () => {
    const { container } = render(<DashboardLoading />);

    expect(container.firstElementChild).toHaveClass(
      "max-w-7xl",
      "mx-auto",
      "space-y-8",
    );
  });

  it("renders skeleton placeholder nodes, not a spinner", () => {
    render(<DashboardLoading />);

    expect(screen.getByTestId("budget-categories-skeleton")).toBeInTheDocument();
    expect(screen.queryByRole("status")).not.toBeInTheDocument();
  });
});
